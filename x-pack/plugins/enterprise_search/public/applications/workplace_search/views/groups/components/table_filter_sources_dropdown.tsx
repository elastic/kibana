/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFilterButton, EuiFilterGroup, EuiPopover } from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';
import { SourcesList } from './sources_list';

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
      Sources
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
