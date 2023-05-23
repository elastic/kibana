/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { css } from '@emotion/react';
import moment from 'moment-timezone';

import { EuiButtonEmpty, EuiTabbedContent } from '@elastic/eui';

import { Optional } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';
import { stringHash } from '@kbn/ml-string-hash';

import { isDefined } from '@kbn/ml-is-defined';

import { TransformHealthAlertRule } from '../../../../../../common/types/alerting';

import { TransformListRow } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';

import { ExpandedRowDetailsPane, SectionConfig, SectionItem } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';
import { ExpandedRowPreviewPane } from './expanded_row_preview_pane';
import { ExpandedRowHealthPane } from './expanded_row_health_pane';
import { TransformHealthColoredDot } from './transform_health_colored_dot';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

type Item = SectionItem;

interface Props {
  item: TransformListRow;
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void;
}

type StateValues = Optional<TransformListRow['stats'], 'stats' | 'checkpointing'>;

export const ExpandedRow: FC<Props> = ({ item, onAlertEdit }) => {
  const {
    ml: { formatHumanReadableDateTimeSeconds },
  } = useAppDependencies();
  const stateValues: StateValues = { ...item.stats };
  delete stateValues.stats;
  delete stateValues.checkpointing;

  const stateItems: Item[] = [];
  stateItems.push(
    {
      title: 'ID',
      description: item.id,
    },
    {
      title: 'state',
      description: item.stats.state,
    }
  );
  if (item.stats.node !== undefined) {
    stateItems.push({
      title: 'node.name',
      description: item.stats.node.name,
    });
  }
  if (item.stats.health !== undefined) {
    stateItems.push({
      title: 'health',
      description: <TransformHealthColoredDot healthStatus={item.stats.health.status} />,
    });
  }

  const state: SectionConfig = {
    title: 'State',
    items: stateItems,
    position: 'right',
  };

  const configItems = useMemo(() => {
    const configs: Item[] = [
      {
        title: 'transform_id',
        description: item.id,
      },
      {
        title: 'transform_version',
        description: item.config.version,
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
        description: Array.isArray(item.config.dest.index)
          ? item.config.dest.index[0]
          : item.config.dest.index,
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

  const general: SectionConfig = {
    title: 'General',
    items: configItems,
    position: 'left',
  };

  const checkpointingItems: Item[] = [];
  if (item.stats.checkpointing.changes_last_detected_at !== undefined) {
    checkpointingItems.push({
      title: 'changes_last_detected_at',
      description: formatHumanReadableDateTimeSeconds(
        item.stats.checkpointing.changes_last_detected_at
      ),
    });
  }

  if (item.stats.checkpointing.last !== undefined) {
    checkpointingItems.push({
      title: 'last.checkpoint',
      description: item.stats.checkpointing.last.checkpoint,
    });
    if (item.stats.checkpointing.last.timestamp_millis !== undefined) {
      checkpointingItems.push({
        title: 'last.timestamp',
        description: formatHumanReadableDateTimeSeconds(
          item.stats.checkpointing.last.timestamp_millis
        ),
      });
      checkpointingItems.push({
        title: 'last.timestamp_millis',
        description: item.stats.checkpointing.last.timestamp_millis,
      });
    }
  }

  if (item.stats.checkpointing.last_search_time !== undefined) {
    checkpointingItems.push({
      title: 'last_search_time',
      description: formatHumanReadableDateTimeSeconds(item.stats.checkpointing.last_search_time),
    });
  }

  if (item.stats.checkpointing.next !== undefined) {
    checkpointingItems.push({
      title: 'next.checkpoint',
      description: item.stats.checkpointing.next.checkpoint,
    });
    if (item.stats.checkpointing.next.checkpoint_progress !== undefined) {
      checkpointingItems.push({
        title: 'next.checkpoint_progress.total_docs',
        description: item.stats.checkpointing.next.checkpoint_progress.total_docs,
      });
      checkpointingItems.push({
        title: 'next.checkpoint_progress.docs_remaining',
        description: item.stats.checkpointing.next.checkpoint_progress.docs_remaining,
      });
      checkpointingItems.push({
        title: 'next.checkpoint_progress.percent_complete',
        description: item.stats.checkpointing.next.checkpoint_progress.percent_complete,
      });
    }
  }

  if (item.stats.checkpointing.operations_behind !== undefined) {
    checkpointingItems.push({
      title: 'operations_behind',
      description: item.stats.checkpointing.operations_behind,
    });
  }

  const alertRuleItems: Item[] | undefined = item.alerting_rules?.map((rule) => {
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
    title: 'Checkpointing',
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

  const stats: SectionConfig = {
    title: 'Stats',
    items: Object.entries(item.stats.stats).map((s) => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const tabId = stringHash(item.id);

  const tabs = [
    {
      id: `transform-details-tab-${tabId}`,
      'data-test-subj': 'transformDetailsTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformDetailsLabel',
        {
          defaultMessage: 'Details',
        }
      ),
      content: (
        <ExpandedRowDetailsPane
          sections={[
            general,
            state,
            checkpointing,
            ...(alertingRules.items ? [alertingRules] : []),
          ]}
          dataTestSubj={'transformDetailsTabContent'}
        />
      ),
    },
    {
      id: `transform-stats-tab-${tabId}`,
      'data-test-subj': 'transformStatsTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformStatsLabel',
        {
          defaultMessage: 'Stats',
        }
      ),
      content: (
        <ExpandedRowDetailsPane sections={[stats]} dataTestSubj={'transformStatsTabContent'} />
      ),
    },
    {
      id: `transform-json-tab-${tabId}`,
      'data-test-subj': 'transformJsonTab',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    ...(item.stats.health
      ? [
          {
            id: `transform-health-tab-${tabId}`,
            'data-test-subj': 'transformHealthTab',
            name: i18n.translate(
              'xpack.transform.transformList.transformDetails.tabs.transformHealthLabel',
              {
                defaultMessage: 'Health',
              }
            ),
            content: <ExpandedRowHealthPane health={item.stats.health} />,
          },
        ]
      : []),
    {
      id: `transform-messages-tab-${tabId}`,
      'data-test-subj': 'transformMessagesTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformMessagesLabel',
        {
          defaultMessage: 'Messages',
        }
      ),
      content: <ExpandedRowMessagesPane transformId={item.id} />,
    },
    {
      id: `transform-preview-tab-${tabId}`,
      'data-test-subj': 'transformPreviewTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformPreviewLabel',
        {
          defaultMessage: 'Preview',
        }
      ),
      content: <ExpandedRowPreviewPane transformConfig={item.config} />,
    },
  ];

  // Using `expand=false` here so the tabs themselves don't spread
  // across the full width. The 100% width is used so the bottom line
  // as well as the tab content spans across the full width,
  // even if the tab content wouldn't extend to the full width.
  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      onTabClick={() => {}}
      expand={false}
      css={css`
        width: 100%;

        .euiTable {
          background-color: transparent;
        }
      `}
      data-test-subj="transformExpandedRowTabbedContent"
    />
  );
};
