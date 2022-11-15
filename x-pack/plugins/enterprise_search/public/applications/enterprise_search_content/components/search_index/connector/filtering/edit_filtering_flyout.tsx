/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiText,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AdvancedFilteringRules } from './advanced_filtering_rules';
import { EditFilteringTab } from './edit_filtering_tab';
import { FilteringRulesTable } from './editable_filtering_rules_table';

interface EditFilteringFlyoutProps {
  revertLocalAdvancedFiltering: () => void;
  revertLocalFilteringRules: () => void;
  setIsEditing: (value: boolean) => void;
}

enum FilteringTabs {
  BASIC = 'basic',
  ADVANCED = 'advanced',
}

export const EditFilteringFlyout: React.FC<EditFilteringFlyoutProps> = ({
  revertLocalFilteringRules,
  revertLocalAdvancedFiltering,
  setIsEditing,
}) => {
  const tabs: EuiTabbedContentTab[] = [
    {
      content: (
        <EditFilteringTab revertAction={revertLocalFilteringRules}>
          <FilteringRulesTable />
        </EditFilteringTab>
      ),
      id: FilteringTabs.BASIC,
      name: i18n.translate(
        'xpack.enterpriseSearch.content.index.connector.filtering.basicTabTitle',
        {
          defaultMessage: 'Basic filters',
        }
      ),
    },
    {
      content: (
        <EditFilteringTab revertAction={revertLocalAdvancedFiltering}>
          <AdvancedFilteringRules />
        </EditFilteringTab>
      ),
      id: FilteringTabs.ADVANCED,
      name: i18n.translate(
        'xpack.enterpriseSearch.content.index.connector.filtering.advancedTabTitle',
        {
          defaultMessage: 'Advanced filters',
        }
      ),
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsEditing(false)}
      aria-labelledby="filteringFlyout"
      size="l"
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="filteringFlyout">
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.connector.filtering.flyout.title',
              {
                defaultMessage: 'Draft rules',
              }
            )}
          </h2>
        </EuiTitle>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.connector.filtering.flyout.description',
            {
              defaultMessage: 'Plan and edit filters here before applying them to the next sync.',
            }
          )}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent tabs={tabs} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
