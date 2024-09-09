/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { userSearchedNotes } from '..';

const SearchRowContainer = styled.div`
  &:not(:last-child) {
    margin-bottom: ${(props) => props.theme.eui.euiSizeL};
  }
`;

SearchRowContainer.displayName = 'SearchRowContainer';

const SearchRowFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: ${(props) => props.theme.eui.euiSizeXS};
`;

SearchRowFlexGroup.displayName = 'SearchRowFlexGroup';

export const SearchRow = React.memo(() => {
  const dispatch = useDispatch();
  const searchBox = useMemo(
    () => ({
      placeholder: 'Search note contents',
      incremental: false,
      'data-test-subj': 'notes-search-bar',
    }),
    []
  );

  const onQueryChange = useCallback(
    ({ queryText }: { queryText: string }) => {
      dispatch(userSearchedNotes(queryText.trim()));
    },
    [dispatch]
  );

  return (
    <SearchRowContainer>
      <SearchRowFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar box={searchBox} onChange={onQueryChange} defaultQuery="" />
        </EuiFlexItem>
      </SearchRowFlexGroup>
    </SearchRowContainer>
  );
});

SearchRow.displayName = 'SearchRow';
