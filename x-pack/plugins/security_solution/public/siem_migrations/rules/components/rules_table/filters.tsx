/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import type { Dispatch, SetStateAction } from 'react';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { RuleSearchField } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table_filters/rule_search_field';
import type { TableFilterOptions } from '../../hooks/use_filter_rules_to_install';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeM};
`;

export interface FiltersComponentProps {
  /**
   * Currently selected table filter
   */
  filterOptions: TableFilterOptions;

  /**
   * Handles filter options changes
   */
  setFilterOptions: Dispatch<SetStateAction<TableFilterOptions>>;
}

/**
 * Collection of filters for filtering data within the SIEM Rules Migrations table.
 * Contains search bar and tag selection
 */
const FiltersComponent: React.FC<FiltersComponentProps> = ({ filterOptions, setFilterOptions }) => {
  const handleOnSearch = useCallback(
    (filterString: string) => {
      setFilterOptions((filters) => ({
        ...filters,
        filter: filterString.trim(),
      }));
    },
    [setFilterOptions]
  );

  return (
    <FilterWrapper gutterSize="m" justifyContent="flexEnd" wrap>
      <RuleSearchField
        initialValue={filterOptions.filter}
        onSearch={handleOnSearch}
        placeholder={i18n.SEARCH_PLACEHOLDER}
      />
    </FilterWrapper>
  );
};

export const Filters = React.memo(FiltersComponent);
Filters.displayName = 'Filters';
