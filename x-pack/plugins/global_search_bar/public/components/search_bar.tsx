/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiText,
  EuiBadge,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ApplicationStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { GlobalSearchPluginStart, GlobalSearchResult } from '../../../global_search/public';

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
  globalSearch: GlobalSearchPluginStart['find'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

const cleanMeta = (str: string) => (str.charAt(0).toUpperCase() + str.slice(1)).replace(/-/g, ' ');

export function SearchBar({ globalSearch, navigateToUrl }: Props) {
  const ifMounted = useIfMounted();
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [options, _setOptions] = useState([] as EuiSelectableTemplateSitewideOption[]);
  const isWindows = navigator.platform.toLowerCase().indexOf('win') >= 0;

  const onSearch = useCallback(
    (currentValue: string) => {
      if (currentValue === searchValue) return;
      const setOptions = (_options: GlobalSearchResult[]) => {
        ifMounted(() =>
          _setOptions([
            ..._options.map((option) => ({
              key: option.id,
              label: option.title,
              url: option.url,
              ...(option.icon && { icon: { type: option.icon } }),
              ...(option.type &&
                option.type !== 'application' && { meta: [{ text: cleanMeta(option.type) }] }),
            })),
          ])
        );
      };

      let arr: GlobalSearchResult[] = [];
      globalSearch(currentValue, {}).subscribe({
        next: ({ results }) => {
          if (currentValue.length > 0) {
            arr = [...results, ...arr].sort((a, b) => {
              if (a.score < b.score) return 1;
              if (a.score > b.score) return -1;
              return 0;
            });
            setOptions(arr);
            return;
          }

          // if searchbar is empty, filter to only applications and sort alphabetically
          results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

          arr = [...results, ...arr].sort((a, b) => {
            const titleA = a.title.toUpperCase(); // ignore upper and lowercase
            const titleB = b.title.toUpperCase(); // ignore upper and lowercase
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
          });

          setOptions(arr);
        },
        error: () => {
          // TODO
        },
        complete: () => {
          ifMounted(() => setSearchValue(currentValue));
        },
      });
    },
    [globalSearch, searchValue, ifMounted]
  );

  const onWindowKeyDown = (event: any) => {
    if (event.key === '/' && (isWindows ? event.ctrlKey : event.metaKey)) {
      if (searchRef) {
        event.preventDefault();
        searchRef.focus();
      }
    }
  };

  const onChange = (selected: EuiSelectableTemplateSitewideOption[]) => {
    // @ts-ignore - ts error is "union type is too complex to express"
    const { url } = selected.find(({ checked }) => checked === 'on');

    // TODO should we be worried about http://?
    if (url.startsWith('https://')) window.location.assign(url);
    else {
      navigateToUrl(url);
      (document.activeElement as HTMLElement).blur();
      onSearch('');
      // setSearchFocus(false);
      if (searchRef) searchRef.value = '';
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', onWindowKeyDown);

    return () => {
      window.removeEventListener('resize', onWindowKeyDown);
    };
  });

  useEffect(() => {
    onSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiSelectableTemplateSitewide
      onChange={onChange}
      options={options}
      searchProps={{
        onSearch,
        'data-test-subj': 'header-search',
        inputRef: setSearchRef,
      }}
      popoverFooter={
        <EuiText color="subdued" size="xs">
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            wrap
          >
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.globalSearchBar.searchBar.shortcut"
                defaultMessage="Quickly search using"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>{isWindows ? 'Ctrl + /' : 'Command + /'}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      }
    />
  );
}
