/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  EuiSelectable,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  keys,
} from '@elastic/eui';
import { ApplicationStart } from 'kibana/public';
import { GlobalSearchResultProvider, GlobalSearchResult } from '../../../global_search/public';

interface Props {
  globalSearch: GlobalSearchResultProvider;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

export function SearchBar({ globalSearch, navigateToUrl }: Props) {
  const [isSearchFocused, setSearchFocus] = useState(false);
  const [options, setOptions] = useState([] as GlobalSearchResult[]);
  const [isLoading, setLoadingState] = useState(false);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const onSearch = useCallback(
    (term: string) => {
      const arr: GlobalSearchResult[] = [];
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
    [globalSearch]
  );

  useEffect(() => {
    onSearch('');
  }, [onSearch]);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (event.key === 'k' && event.metaKey) {
        // TODO if windows, use ctrl
        if (searchRef) searchRef.focus();
      }
    };
    window.addEventListener('keydown', openSearch);

    return () => {
      window.removeEventListener('keydown', openSearch);
    };
  }, [searchRef]);

  return (
    <EuiSelectable
      searchable
      height={300}
      singleSelection={true}
      searchProps={{
        isLoading,
        onSearch,
        'data-test-subj': 'header-search',
        onFocus: () => {
          setSearchFocus(true);
        },
        onBlur: () => setSearchFocus(false),
        placeholder: 'Search for anything...',
        incremental: true,
        compressed: true,
        inputRef: (ref: HTMLInputElement) => {
          setSearchRef(ref);
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
      onChange={(selected) => {
        const { url } = selected.find(({ checked }) => checked === 'on');

        if (typeof url === 'string') {
          if (url.startsWith('https://')) {
            window.location.assign(url);
          } else {
            navigateToUrl(url);
          }
        } else {
          // TODO
        }
      }}
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
