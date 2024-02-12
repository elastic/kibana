/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { sumBy } from 'lodash/fp';

import type { HostRiskScore, RiskStats, UserRiskScore } from '../../../../common/search_strategy';

interface TableItem {
  category: string;
  count: number;
  score: number;
}

interface EntityData {
  name: string;
  risk: RiskStats;
}

export const buildColumns: (showFooter: boolean) => Array<EuiBasicTableColumn<TableItem>> = (
  showFooter
) => [
  {
    field: 'category',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnLabel"
        defaultMessage="Category"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    footer: showFooter ? (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnFooterLabel"
        defaultMessage="Result"
      />
    ) : undefined,
  },
  {
    field: 'score',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.scoreColumnLabel"
        defaultMessage="Score"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    dataType: 'number',
    align: 'right',
    render: (score: number) => displayNumber(score),
    footer: (props) =>
      showFooter ? (
        <span data-test-subj="risk-summary-result-score">
          {displayNumber(sumBy((i) => i.score, props.items))}
        </span>
      ) : undefined,
  },
  {
    field: 'count',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.inputsColumnLabel"
        defaultMessage="Inputs"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    dataType: 'number',
    align: 'right',
    footer: (props) =>
      showFooter ? (
        <span data-test-subj="risk-summary-result-count">{sumBy((i) => i.count, props.items)}</span>
      ) : undefined,
  },
];

export const getItems: (
  entityData: EntityData | undefined,
  isAssetCriticalityEnabled: boolean
) => TableItem[] = (entityData, isAssetCriticalityEnabled) => {
  return [
    {
      category: i18n.translate('xpack.securitySolution.flyout.entityDetails.alertsGroupLabel', {
        defaultMessage: 'Alerts',
      }),
      score: entityData?.risk.category_1_score ?? 0,
      count: entityData?.risk.category_1_count ?? 0,
    },
    ...(isAssetCriticalityEnabled
      ? [
          {
            category: i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.contextGroupLabel',
              {
                defaultMessage: 'Contexts',
              }
            ),
            score: entityData?.risk.category_2_score ?? 0,
            count: entityData?.risk.category_2_count ?? 0,
          },
        ]
      : []),
  ];
};

export function isUserRiskData(
  riskData: UserRiskScore | HostRiskScore | undefined
): riskData is UserRiskScore {
  return !!riskData && (riskData as UserRiskScore).user !== undefined;
}

export const getEntityData = (
  riskData: UserRiskScore | HostRiskScore | undefined
): EntityData | undefined => {
  if (!riskData) {
    return;
  }

  if (isUserRiskData(riskData)) {
    return riskData.user;
  }

  return riskData.host;
};

const displayNumber = (num: number) => num.toFixed(2);

export const LENS_VISUALIZATION_HEIGHT = 126; //  Static height in pixels specified by design
export const LENS_VISUALIZATION_MIN_WIDTH = 160; // Lens visualization min-width in pixels
export const SUMMARY_TABLE_MIN_WIDTH = 180; // Summary table min-width in pixels
export const LAST_30_DAYS = { from: 'now-30d', to: 'now' };
