/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiTabbedContent } from '@elastic/eui';
import { Optional } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';

import moment from 'moment-timezone';
import { formatHumanReadableDateTimeSeconds } from '../../../../../shared_imports';
import { TransformListRow } from '../../../../common';
import { ExpandedRowDetailsPane, SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';
import { ExpandedRowPreviewPane } from './expanded_row_preview_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface Item {
  title: string;
  description: any;
}

interface Props {
  item: TransformListRow;
}

type StateValues = Optional<TransformListRow['stats'], 'stats' | 'checkpointing'>;

export const ExpandedRow: FC<Props> = ({ item }) => {
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

  const state: SectionConfig = {
    title: 'State',
    items: stateItems,
    position: 'right',
  };

  const configItems: Item[] = [
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
  ];

  const general: SectionConfig = {
    title: 'General',
    items: configItems,
    position: 'left',
  };

  const checkpointingItems: Item[] = [];
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

  const checkpointing: SectionConfig = {
    title: 'Checkpointing',
    items: checkpointingItems,
    position: 'right',
  };

  const stats: SectionConfig = {
    title: 'Stats',
    items: Object.entries(item.stats.stats).map((s) => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const tabs = [
    {
      id: `transform-details-tab-${item.id}`,
      'data-test-subj': 'transformDetailsTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformDetailsLabel',
        {
          defaultMessage: 'Details',
        }
      ),
      content: <ExpandedRowDetailsPane sections={[general, state, checkpointing]} />,
    },
    {
      id: `transform-stats-tab-${item.id}`,
      'data-test-subj': 'transformStatsTab',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.tabs.transformStatsLabel',
        {
          defaultMessage: 'Stats',
        }
      ),
      content: <ExpandedRowDetailsPane sections={[stats]} />,
    },
    {
      id: `transform-json-tab-${item.id}`,
      'data-test-subj': 'transformJsonTab',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    {
      id: `transform-messages-tab-${item.id}`,
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
      id: `transform-preview-tab-${item.id}`,
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
      style={{ width: '100%' }}
    />
  );
};
