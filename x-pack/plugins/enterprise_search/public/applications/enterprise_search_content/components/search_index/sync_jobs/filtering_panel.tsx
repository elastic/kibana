/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCode,
  EuiCodeBlock,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  FilteringPolicy,
  FilteringRule,
  FilteringRuleRule,
  FilteringRules,
} from '../../../../../../common/types/connectors';

import { filteringRuleToText, filteringPolicyToText } from '../../../utils/filtering_rule_helpers';

import { FlyoutPanel } from './flyout_panel';

interface FilteringPanelProps {
  advancedSnippet?: FilteringRules['advanced_snippet'];
  filteringRules: FilteringRule[];
}

export const FilteringPanel: React.FC<FilteringPanelProps> = ({
  advancedSnippet,
  filteringRules,
}) => {
  const columns: Array<EuiBasicTableColumn<FilteringRule>> = [
    {
      field: 'policy',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.filtering.policy', {
        defaultMessage: 'Pipeline setting',
      }),
      render: (policy: FilteringPolicy) => filteringPolicyToText(policy),
    },
    {
      field: 'rule',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.filtering.rule', {
        defaultMessage: 'Rule',
      }),
      render: (rule: FilteringRuleRule) => filteringRuleToText(rule),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.filtering.value', {
        defaultMessage: 'Value',
      }),
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
  ];
  return (
    <>
      <FlyoutPanel
        title={i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.filteringTitle', {
          defaultMessage: 'Filtering',
        })}
      >
        <EuiBasicTable
          columns={columns}
          items={filteringRules.sort(({ order }, { order: secondOrder }) => order - secondOrder)}
        />
      </FlyoutPanel>
      {!!advancedSnippet?.value ? (
        <>
          <EuiSpacer />
          <FlyoutPanel
            title={i18n.translate(
              'xpack.enterpriseSearch.content.index.syncJobs.filteringAdvancedTitle',
              {
                defaultMessage: 'Advanced filtering rules',
              }
            )}
          >
            <EuiPanel hasShadow={false}>
              <EuiCodeBlock transparentBackground language="json">
                {JSON.stringify(advancedSnippet.value, undefined, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          </FlyoutPanel>
        </>
      ) : (
        <></>
      )}
    </>
  );
};
