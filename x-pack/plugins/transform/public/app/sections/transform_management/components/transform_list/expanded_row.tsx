/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { css } from '@emotion/react';

import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { stringHash } from '@kbn/ml-string-hash';

import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';

import type { TransformListRow } from '../../../../common';

import { ExpandedRowDetailsPane } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';
import { ExpandedRowPreviewPane } from './expanded_row_preview_pane';
import { ExpandedRowHealthPane } from './expanded_row_health_pane';
import { ExpandedRowStatsPane } from './expanded_row_stats_pane';

interface Props {
  item: TransformListRow;
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void;
}

export const ExpandedRow: FC<Props> = ({ item, onAlertEdit }) => {
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
      content: <ExpandedRowDetailsPane item={item} onAlertEdit={onAlertEdit} />,
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
      content: <ExpandedRowStatsPane item={item} />,
    },
    {
      id: `transform-json-tab-${tabId}`,
      'data-test-subj': 'transformJsonTab',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    ...(item.stats?.health
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
