/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFilterButton, EuiFilterGroup, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GroupsLogic } from '../groups_logic';

import { SourcesList } from './sources_list';

const FILTER_SOURCES_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.filterSources.buttonText',
  {
    defaultMessage: 'Sources',
  }
);

export const TableFilterSourcesDropdown: React.FC = () => {
  const {
    addFilteredSource,
    removeFilteredSource,
    toggleFilterSourcesDropdown,
    closeFilterSourcesDropdown,
  } = useActions(GroupsLogic);
  const { contentSources, filterSourcesDropdownOpen, filteredSources } = useValues(GroupsLogic);

  const sourceIds = contentSources.map(({ id }) => id);

  const filterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={toggleFilterSourcesDropdown}
      isDisabled={sourceIds.length === 0}
      isSelected={filterSourcesDropdownOpen}
      numFilters={sourceIds.length}
      hasActiveFilters={filteredSources.length > 0}
      numActiveFilters={filteredSources.length}
    >
      {FILTER_SOURCES_BUTTON_TEXT}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={filterButton}
        isOpen={filterSourcesDropdownOpen}
        closePopover={closeFilterSourcesDropdown}
        panelPaddingSize="none"
      >
        <SourcesList
          contentSources={contentSources}
          filteredSources={filteredSources}
          addFilteredSource={addFilteredSource}
          removeFilteredSource={removeFilteredSource}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
