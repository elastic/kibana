/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiSelectable,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
} from '@elastic/eui';
import { map, takeUntil } from 'rxjs/operators';
import { GlobalSearchResultProvider } from '../../global_search/public';

export function SearchBar({ globalSearch }: GlobalSearchResultProvider) {
  const [isSearchFocused, setSearchFocus] = useState(false);
  const [options, setOptions] = useState([]);
  const [isLoading, setLoadingState] = useState(false);

  return (
    <EuiSelectable
      searchable
      height={300}
      singleSelection={true}
      searchProps={{
        isLoading,
        'data-test-subj': 'header-search',
        onFocus: () => {
          setSearchFocus(true);
        },
        onBlur: () => setSearchFocus(false),
        placeholder: 'Search for anything...',
        incremental: true,
        compressed: true,
        onSearch: async (term) => {
          const arr = [];
          setLoadingState(true);
          globalSearch.find(term, {}).subscribe({
            next: ({ results }) => {
              arr.push(...results);
              setOptions([...arr]);
            },
            error: () => {
              // TODO
            },
            complete: () => {
              setLoadingState(false);
            },
          });
        },
      }}
      listProps={{
        rowHeight: 68,
      }}
      options={options.map((option) => ({ key: option.id, ...option }))}
      renderOption={(option, searchValue) => (
        <EuiFlexGroup responsive={false} gutterSize="s">
          <EuiFlexItem grow={false}>{option.icon && <EuiIcon type={option.icon} />}</EuiFlexItem>
          <EuiFlexItem>{option.title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge
              aria-hidden={true}
              className="kibanaChromeSearch__itemGotoBadge"
              color="hollow"
            >
              Go to <small>&#x21A9;</small>
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    >
      {(list, search) => (
        <>
          <EuiPopover
            button={search}
            isOpen={isSearchFocused}
            closePopover={() => setSearchFocus(false)}
            panelPaddingSize={'none'}
            hasArrow={false}
          >
            <div style={{ width: '600px' }}>{list}</div>
            <EuiPopoverFooter>
              <EuiText className="kibanaChromeSearch__popoverFooter" size="xs">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem />
                  <EuiFlexItem grow={false}>Quickly search using</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* TODO this is for mac only */}
                    <EuiBadge>Command + K</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiText>
            </EuiPopoverFooter>
          </EuiPopover>
        </>
      )}
    </EuiSelectable>
  );
}
