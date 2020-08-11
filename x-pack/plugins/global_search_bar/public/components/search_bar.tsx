/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useRef, FocusEvent } from 'react';
import {
  EuiSelectable,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  EuiSelectableOption,
} from '@elastic/eui';
import { ApplicationStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SearchServiceStart, GlobalSearchResult } from '../../../global_search/public';

const useIfMounted = () => {
  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  const ifMounted = useCallback((func) => {
    if (isMounted.current && func) {
      func();
    }
  }, []);

  return ifMounted;
};

interface Props {
  globalSearch: SearchServiceStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

export function SearchBar({ globalSearch, navigateToUrl }: Props) {
  const ifMounted = useIfMounted();
  const [isSearchFocused, setSearchFocus] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const [options, _setOptions] = useState([] as GlobalSearchResult[]);
  // const [isLoading, setLoadingState] = useState(false);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [panelRef, setPanelRef] = useState<HTMLElement | null>(null);
  const isWindows = navigator.platform.toLowerCase().indexOf('win') >= 0;

  const onSearch = useCallback(
    (currentTerm: string) => {
      if (currentTerm === term) return;
      const setOptions = (_options: GlobalSearchResult[]) => {
        ifMounted(() =>
          _setOptions([..._options.map((option) => ({ key: option.id, ...option }))])
        );
      };

      let arr: GlobalSearchResult[] = [];
      // setLoadingState(true);
      globalSearch.find(currentTerm, {}).subscribe({
        next: ({ results }) => {
          // if something was searched
          if (currentTerm.length > 0) {
            arr.push(...results);
            setOptions(arr);
            return;
          }

          // if searchbar is empty, filter to only applications and sort alphabetically
          results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

          arr = [...results, ...arr].sort((a, b) => {
            const titleA = a.title.toUpperCase(); // ignore upper and lowercase
            const titleB = b.title.toUpperCase(); // ignore upper and lowercase
            if (titleA < titleB) {
              return -1;
            }
            if (titleA > titleB) {
              return 1;
            }

            // titles must be equal
            return 0;
          });

          setOptions(arr);
        },
        error: () => {
          // TODO
        },
        complete: () => {
          ifMounted(() => setTerm(currentTerm));
          // setLoadingState(false);
        },
      });
    },
    [globalSearch, term, ifMounted]
  );

  useEffect(() => {
    onSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (event.key === 's' && (isWindows ? event.ctrlKey : event.metaKey)) {
        if (searchRef) {
          event.preventDefault();
          searchRef.focus();
        }
      }
    };
    window.addEventListener('keydown', openSearch);

    return () => {
      window.removeEventListener('keydown', openSearch);
    };
  }, [searchRef, isWindows]);

  return (
    <EuiSelectable
      searchable
      height={300}
      singleSelection={true}
      searchProps={{
        onSearch,
        'data-test-subj': 'header-search',
        onFocus: () => {
          setSearchFocus(true);
        },
        onBlur: (e: FocusEvent<HTMLInputElement>) => {
          if (!panelRef?.contains(e.relatedTarget as HTMLButtonElement)) {
            setSearchFocus(false);
          }
        },
        placeholder: 'Search for anything...',
        incremental: true,
        compressed: true,
        inputRef: (ref: HTMLInputElement) => {
          setSearchRef(ref);
        },
        'aria-label': i18n.translate('xpack.globalSearchBar.primaryNav.screenReaderLabel', {
          defaultMessage: 'Search for anything...',
        }),
      }}
      listProps={{
        rowHeight: 68,
      }}
      // @ts-ignore EUI TS doesn't allow not list options to be passed but it all works
      options={options}
      // @ts-ignore EUI TS doesn't allow not list options to be passed but it all works
      renderOption={(option: EuiSelectableOption & GlobalSearchResult) => (
        <EuiFlexGroup responsive={false} gutterSize="s" data-test-subj="header-search-option">
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
      // @ts-ignore EUI TS doesn't allow not list options to be passed but it all works
      onChange={async (selected: Array<EuiSelectableOption & GlobalSearchResult>) => {
        const { url } = selected.find(({ checked }) => checked === 'on')!;

        if (url.startsWith('https://')) {
          // if absolute path
          window.location.assign(url);
        } else {
          // else is relative path
          await navigateToUrl(url);
          // a simplified "get first tabbale element" with likely subjects
          (document.activeElement as HTMLElement).blur();
          setSearchFocus(false);
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
            panelRef={setPanelRef}
            className="foo"
          >
            <div style={{ width: '600px' }}>{list}</div>
            <EuiPopoverFooter>
              <EuiText className="kibanaChromeSearch__popoverFooter" size="xs">
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="flexEnd"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false} component="p">
                    <FormattedMessage
                      id="xpack.globalSearchBar.searchBar.shortcut"
                      defaultMessage="Quickly search using {shortcut}"
                      values={{
                        shortcut: <EuiBadge>{isWindows ? 'Ctrl + S' : 'Command + S'}</EuiBadge>,
                      }}
                    />
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
