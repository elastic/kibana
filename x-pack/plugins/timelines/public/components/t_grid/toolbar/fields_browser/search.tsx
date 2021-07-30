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

import { getFieldBrowserSearchInputClassName, getFieldCount } from './helpers';

import * as i18n from './translations';

const CountsFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
  margin-left: ${({ theme }) => theme.eui.euiSizeXS};
`;

CountsFlexGroup.displayName = 'CountsFlexGroup';

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
    gutterSize="xs"
  >
    <EuiFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="categories-count" size="xs">
        {i18n.CATEGORIES_COUNT(Object.keys(filteredBrowserFields).length)}
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="fields-count" size="xs">
        {i18n.FIELDS_COUNT(
          Object.keys(filteredBrowserFields).reduce<number>(
            (fieldsCount, category) => getFieldCount(filteredBrowserFields[category]) + fieldsCount,
            0
          )
        )}
      </EuiText>
    </EuiFlexItem>
  </CountsFlexGroup>
));

CountRow.displayName = 'CountRow';

export const Search = React.memo<Props>(
  ({ isSearching, filteredBrowserFields, onSearchInputChange, searchInput, timelineId }) => (
    <>
      <EuiFieldSearch
        className={getFieldBrowserSearchInputClassName(timelineId)}
        data-test-subj="field-search"
        isLoading={isSearching}
        onChange={onSearchInputChange}
        placeholder={i18n.FILTER_PLACEHOLDER}
        value={searchInput}
        fullWidth
      />
      <CountRow filteredBrowserFields={filteredBrowserFields} />
    </>
  )
);

Search.displayName = 'Search';
