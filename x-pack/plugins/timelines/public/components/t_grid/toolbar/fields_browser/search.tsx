/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import type { BrowserFields } from '../../../../../common';

import { getFieldBrowserSearchInputClassName, getFieldCount, SEARCH_INPUT_WIDTH } from './helpers';

import * as i18n from './translations';

const CountsFlexGroup = styled(EuiFlexGroup)`
  margin-top: 5px;
`;

CountsFlexGroup.displayName = 'CountsFlexGroup';

const CountFlexItem = styled(EuiFlexItem)`
  margin-right: 5px;
`;

CountFlexItem.displayName = 'CountFlexItem';

const SearchContainer = styled.div`
  padding: 0 16px 16px 16px;
  margin-bottom: 8px;
`;

SearchContainer.displayName = 'SearchContainer';

const SearchInputContainer = styled.div`
  input {
    max-width: ${SEARCH_INPUT_WIDTH}px;
    width: ${SEARCH_INPUT_WIDTH}px;
  }
`;

SearchInputContainer.displayName = 'SearchInputContainer';

interface Props {
  filteredBrowserFields: BrowserFields;
  isSearching: boolean;
  onSearchInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchInput: string;
  timelineId: string;
}

const CountRow = React.memo<Pick<Props, 'filteredBrowserFields'>>(({ filteredBrowserFields }) => (
  <CountsFlexGroup
    alignItems="center"
    data-test-subj="counts-flex-group"
    direction="row"
    gutterSize="none"
  >
    <CountFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="categories-count" size="xs">
        {i18n.CATEGORIES_COUNT(Object.keys(filteredBrowserFields).length)}
      </EuiText>
    </CountFlexItem>

    <CountFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="fields-count" size="xs">
        {i18n.FIELDS_COUNT(
          Object.keys(filteredBrowserFields).reduce<number>(
            (fieldsCount, category) => getFieldCount(filteredBrowserFields[category]) + fieldsCount,
            0
          )
        )}
      </EuiText>
    </CountFlexItem>
  </CountsFlexGroup>
));

CountRow.displayName = 'CountRow';

export const Search = React.memo<Props>(
  ({ isSearching, filteredBrowserFields, onSearchInputChange, searchInput, timelineId }) => (
    <SearchContainer>
      <SearchInputContainer>
        <EuiFieldSearch
          className={getFieldBrowserSearchInputClassName(timelineId)}
          data-test-subj="field-search"
          isLoading={isSearching}
          onChange={onSearchInputChange}
          placeholder={i18n.FILTER_PLACEHOLDER}
          value={searchInput}
          fullWidth
        />
      </SearchInputContainer>
      <CountRow filteredBrowserFields={filteredBrowserFields} />
    </SearchContainer>
  )
);

Search.displayName = 'Search';
