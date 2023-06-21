/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiCode } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  FilteringRule,
  FilteringPolicy,
  FilteringRuleRule,
} from '../../../../../../common/types/connectors';

import { filteringPolicyToText, filteringRuleToText } from '../../../utils/filtering_rule_helpers';

interface FilteringRulesTableProps {
  filteringRules: FilteringRule[];
  showOrder: boolean;
}

export const FilteringRulesTable: React.FC<FilteringRulesTableProps> = ({
  showOrder,
  filteringRules,
}) => {
  const columns: Array<EuiBasicTableColumn<FilteringRule>> = [
    ...(showOrder
      ? [
          {
            field: 'order',
            name: i18n.translate('xpack.enterpriseSearch.content.index.filtering.priority', {
              defaultMessage: 'Rule priority',
            }),
          },
        ]
      : []),
    {
      field: 'policy',
      name: i18n.translate('xpack.enterpriseSearch.content.index.filtering.policy', {
        defaultMessage: 'Policy',
      }),
      render: (policy: FilteringPolicy) => filteringPolicyToText(policy),
    },
    {
      field: 'field',
      name: i18n.translate('xpack.enterpriseSearch.content.index.filtering.field', {
        defaultMessage: 'field',
      }),
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
    {
      field: 'rule',
      name: i18n.translate('xpack.enterpriseSearch.content.index.filtering.rule', {
        defaultMessage: 'Rule',
      }),
      render: (rule: FilteringRuleRule) => filteringRuleToText(rule),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.enterpriseSearch.content.index.filtering.value', {
        defaultMessage: 'Value',
      }),
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
  ];
  return (
    <EuiBasicTable
      columns={columns}
      items={filteringRules.sort(({ order }, { order: secondOrder }) => order - secondOrder)}
    />
  );
};
