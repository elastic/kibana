/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringRule, FilteringRules } from '../../../../../../common/types/connectors';

import { FilteringRulesTable } from '../../shared/filtering_rules_table/filtering_rules_table';

import { FlyoutPanel } from './flyout_panel';

interface FilteringPanelProps {
  advancedSnippet?: FilteringRules['advanced_snippet'];
  filteringRules: FilteringRule[];
}

export const FilteringPanel: React.FC<FilteringPanelProps> = ({
  advancedSnippet,
  filteringRules,
}) => {
  return (
    <>
      <FlyoutPanel
        title={i18n.translate('xpack.enterpriseSearch.content.index.syncJobs.filteringTitle', {
          defaultMessage: 'Filtering',
        })}
      >
        <FilteringRulesTable filteringRules={filteringRules} showOrder={false} />
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
