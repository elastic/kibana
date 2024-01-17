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

import type {
  HostRiskScore,
  RiskStats,
  UserRiskScore,
} from '../../../../common/search_strategy/security_solution/risk_score';

interface TableItem {
  category: string;
  count: number;
  score: string;
}

interface EntityData {
  name: string;
  risk: RiskStats;
}

export const buildColumns: () => Array<EuiBasicTableColumn<TableItem>> = () => [
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
  },
];

export const getItems: (entityData: EntityData | undefined) => TableItem[] = (entityData) => {
  return [
    {
      category: i18n.translate('xpack.securitySolution.flyout.entityDetails.alertsGroupLabel', {
        defaultMessage: 'Alerts',
      }),
      score: displayNumber(entityData?.risk.category_1_score ?? 0),
      count: entityData?.risk.category_1_count ?? 0,
    },
    {
      category: i18n.translate('xpack.securitySolution.flyout.entityDetails.contextGroupLabel', {
        defaultMessage: 'Contexts',
      }),
      score: displayNumber(entityData?.risk.category_2_score ?? 0),
      count: entityData?.risk.category_2_count ?? 0,
    },
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
export const LAST_30_DAYS = { from: 'now-30d', to: 'now' };
