/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFilterGroup,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';
import * as i18n from '../translations';
import { OpenTimelineProps } from '../types';

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

type Props = Pick<
  OpenTimelineProps,
  | 'favoriteCount'
  | 'onlyFavorites'
  | 'onQueryChange'
  | 'onToggleOnlyFavorites'
  | 'query'
  | 'timelineType'
> & { children?: JSX.Element | null };

/**
 * Renders the row containing the search input and Only Favorites filter
 */
export const SearchRow = React.memo<Props>(
  ({
    favoriteCount,
    onlyFavorites,
    onQueryChange,
    onToggleOnlyFavorites,
    children,
    timelineType,
  }) => {
    const searchBox = useMemo(
      () => ({
        placeholder:
          timelineType === TimelineType.default
            ? i18n.SEARCH_PLACEHOLDER
            : i18n.SEARCH_TEMPLATE_PLACEHOLDER,
        incremental: false,
      }),
      [timelineType]
    );

    return (
      <SearchRowContainer>
        <SearchRowFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiSearchBar data-test-subj="search-bar" box={searchBox} onChange={onQueryChange} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFilterGroup fullWidth={true}>
              <>
                <EuiFilterButton
                  data-test-subj="only-favorites-toggle"
                  hasActiveFilters={onlyFavorites}
                  onClick={onToggleOnlyFavorites}
                  numFilters={favoriteCount ?? undefined}
                >
                  {i18n.ONLY_FAVORITES}
                </EuiFilterButton>
                {!!children && children}
              </>
            </EuiFilterGroup>
          </EuiFlexItem>
        </SearchRowFlexGroup>
      </SearchRowContainer>
    );
  }
);

SearchRow.displayName = 'SearchRow';
