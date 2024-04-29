/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import moment from 'moment-timezone';

import { EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { isDefined } from '@kbn/ml-is-defined';

import { mapEsHealthStatus2TransformHealthStatus } from '../../../../../../common/constants';
import { isTransformStats } from '../../../../../../common/types/transform_stats';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';

import type { TransformListRow } from '../../../../common';
import { useEnabledFeatures } from '../../../../serverless_context';
import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { useGetTransformStats } from '../../../../hooks';

import { TransformHealthColoredDot } from './transform_health_colored_dot';
import type { SectionConfig, SectionItem } from './expanded_row_column_view';
import { ExpandedRowColumnView } from './expanded_row_column_view';

interface ExpandedRowDetailsPaneProps {
  item: TransformListRow;
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void;
}

export const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps> = ({ item, onAlertEdit }) => {
  const { data: fullStats, isError, isLoading } = useGetTransformStats(item.id, false, true);

  let displayStats = {};

  if (fullStats !== undefined && !isLoading && !isError) {
    displayStats = fullStats.transforms[0];
  } else if (isTransformListRowWithStats(item)) {
    displayStats = item.stats;
  }

  const { showNodeInfo } = useEnabledFeatures();

  const stateItems: SectionItem[] = [
    {
      title: 'ID',
      description: item.id,
    },
  ];

  const configItems = useMemo(() => {
    const configs: SectionItem[] = [
      {
        title: 'transform_id',
        description: item.id,
      },
      {
        title: 'transform_version',
        description: item.config.version ?? '',
      },
      {
        title: 'description',
        description: item.config.description ?? '',
      },
      {
        title: 'create_time',
        description:
          formatHumanReadableDateTimeSeconds(moment(item.config.create_time).unix() * 1000) ?? '',
      },
      {
        title: 'source_index',
        description: Array.isArray(item.config.source.index)
          ? item.config.source.index[0]
          : item.config.source.index,
      },
      {
        title: 'destination_index',
        description: item.config.dest.index,
      },
      {
        title: 'authorization',
        description: item.config.authorization ? JSON.stringify(item.config.authorization) : '',
      },
    ];
    if (isDefined(item.config.settings?.num_failure_retries)) {
      configs.push({
        title: 'num_failure_retries',
        description: item.config.settings?.num_failure_retries ?? '',
      });
    }
    return configs;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.config]);

  const checkpointingItems: SectionItem[] = [];
  if (isTransformStats(displayStats)) {
    stateItems.push({
      title: 'state',
      description: displayStats.state,
    });
    if (showNodeInfo && displayStats.node !== undefined) {
      stateItems.push({
        title: 'node.name',
        description: displayStats.node.name,
      });
    }
    if (displayStats.health !== undefined) {
      stateItems.push({
        title: 'health',
        description: (
          <TransformHealthColoredDot
            healthStatus={mapEsHealthStatus2TransformHealthStatus(displayStats.health.status)}
          />
        ),
      });
    }

    if (displayStats.checkpointing.changes_last_detected_at !== undefined) {
      checkpointingItems.push({
        title: 'changes_last_detected_at',
        description: formatHumanReadableDateTimeSeconds(
          displayStats.checkpointing.changes_last_detected_at
        ),
      });
    }

    if (displayStats.checkpointing.last !== undefined) {
      checkpointingItems.push({
        title: 'last.checkpoint',
        description: displayStats.checkpointing.last.checkpoint,
      });
      if (displayStats.checkpointing.last.timestamp_millis !== undefined) {
        checkpointingItems.push({
          title: 'last.timestamp',
          description: formatHumanReadableDateTimeSeconds(
            displayStats.checkpointing.last.timestamp_millis
          ),
        });
        checkpointingItems.push({
          title: 'last.timestamp_millis',
          description: displayStats.checkpointing.last.timestamp_millis,
        });
      }
    }

    if (displayStats.checkpointing.last_search_time !== undefined) {
      checkpointingItems.push({
        title: 'last_search_time',
        description: formatHumanReadableDateTimeSeconds(
          displayStats.checkpointing.last_search_time
        ),
      });
    }

    if (displayStats.checkpointing.next !== undefined) {
      checkpointingItems.push({
        title: 'next.checkpoint',
        description: displayStats.checkpointing.next.checkpoint,
      });
      if (displayStats.checkpointing.next.checkpoint_progress !== undefined) {
        checkpointingItems.push({
          title: 'next.checkpoint_progress.total_docs',
          description: displayStats.checkpointing.next.checkpoint_progress.total_docs,
        });
        checkpointingItems.push({
          title: 'next.checkpoint_progress.docs_remaining',
          description: displayStats.checkpointing.next.checkpoint_progress.docs_remaining,
        });
        checkpointingItems.push({
          title: 'next.checkpoint_progress.percent_complete',
          description: `${Math.round(
            displayStats.checkpointing.next.checkpoint_progress.percent_complete
          )}%`,
        });
      }
    }

    if (displayStats.checkpointing.operations_behind !== undefined) {
      checkpointingItems.push({
        title: 'operations_behind',
        description: displayStats.checkpointing.operations_behind,
      });
    }
  }

  const state: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.stateTitle', {
      defaultMessage: 'State',
    }),
    items: stateItems,
    position: 'right',
  };

  const general: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.generalTitle', {
      defaultMessage: 'General',
    }),
    items: configItems,
    position: 'left',
  };

  const alertRuleItems: SectionItem[] | undefined = item.alerting_rules?.map((rule) => {
    return {
      title: (
        <EuiButtonEmpty
          iconType={'documentEdit'}
          iconSide={'left'}
          onClick={() => {
            onAlertEdit(rule);
          }}
          flush="left"
          size={'xs'}
          iconSize={'s'}
        >
          {rule.name}
        </EuiButtonEmpty>
      ),
      description: rule.executionStatus.status,
    };
  });

  const checkpointing: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.checkpointTitle', {
      defaultMessage: 'Checkpointing',
    }),
    items: checkpointingItems,
    position: 'right',
  };

  const alertingRules: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.alertRulesTitle', {
      defaultMessage: 'Alert rules',
    }),
    items: alertRuleItems!,
    position: 'right',
  };

  return (
    <ExpandedRowColumnView
      sections={[general, state, checkpointing, ...(alertingRules.items ? [alertingRules] : [])]}
      showErrorCallout={isError}
      dataTestSubj={'transformDetailsTabContent'}
    />
  );
};
