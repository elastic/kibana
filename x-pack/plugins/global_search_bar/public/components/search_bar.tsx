/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  EuiText,
  EuiSelectableMessage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import React, { useCallback, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import { GlobalSearchPluginStart, GlobalSearchResult } from '../../../global_search/public';

interface Props {
  globalSearch: GlobalSearchPluginStart['find'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

const clearField = (field: HTMLInputElement) => {
  const nativeInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const nativeInputValueSetter = nativeInputValue ? nativeInputValue.set : undefined;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, '');
  }

  field.dispatchEvent(new Event('change'));
};

const cleanMeta = (str: string) => (str.charAt(0).toUpperCase() + str.slice(1)).replace(/-/g, ' ');
const blurEvent = new FocusEvent('blur');

export function SearchBar({ globalSearch, navigateToUrl }: Props) {
  const isMounted = useMountedState();
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [options, _setOptions] = useState([] as EuiSelectableTemplateSitewideOption[]);
  const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

  const setOptions = useCallback(
    (_options: GlobalSearchResult[]) => {
      if (!isMounted()) return;

      _setOptions([
        ..._options.map((option) => ({
          key: option.id,
          label: option.title,
          url: option.url,
          ...(option.icon && { icon: { type: option.icon } }),
          ...(option.type &&
            option.type !== 'application' && { meta: [{ text: cleanMeta(option.type) }] }),
        })),
      ]);
    },
    [isMounted, _setOptions]
  );

  useDebounce(
    () => {
      let arr: GlobalSearchResult[] = [];
      globalSearch(searchValue, {}).subscribe({
        next: ({ results }) => {
          if (searchValue.length > 0) {
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
          // TODO #74430 - add telemetry to see if errors are happening
          // Not doing anything on error right now because it'll either just show the previous
          // results or empty results which is basically what we want anyways
        },
        complete: () => {},
      });
    },
    250,
    [searchValue]
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
      if (searchRef) {
        event.preventDefault();
        searchRef.focus();
      }
    }
  };

  const onChange = (selected: EuiSelectableTemplateSitewideOption[]) => {
    // @ts-ignore - ts error is "union type is too complex to express"
    const { url } = selected.find(({ checked }) => checked === 'on');

    navigateToUrl(url);
    (document.activeElement as HTMLElement).blur();
    if (searchRef) {
      clearField(searchRef);
      searchRef.dispatchEvent(blurEvent);
    }
  };

  useEvent('keydown', onKeyDown);

  return (
    <EuiSelectableTemplateSitewide
      onChange={onChange}
      options={options}
      searchProps={{
        onSearch: setSearchValue,
        'data-test-subj': 'header-search',
        inputRef: setSearchRef,
        compressed: true,
        placeholder: i18n.translate('xpack.globalSearchBar.searchBar.placeholder', {
          defaultMessage: 'Search Elastic',
        }),
      }}
      emptyMessage={
        <EuiSelectableMessage style={{ minHeight: 300 }}>
          <p>
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.noResultsHeading"
              defaultMessage="No results found"
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.noResults"
              defaultMessage="Try searching for applications and saved objects by name."
            />
          </p>
        </EuiSelectableMessage>
      }
      popoverFooter={
        <EuiText color="subdued" size="xs">
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            wrap
          >
            <FormattedMessage
              id="xpack.globalSearchBar.searchBar.shortcut"
              defaultMessage="{what}{how}"
              values={{
                what: <EuiFlexItem grow={false}>Shortcut</EuiFlexItem>,
                how: (
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{isMac ? 'Command + /' : 'Control + /'}</EuiBadge>
                  </EuiFlexItem>
                ),
              }}
            />
          </EuiFlexGroup>
        </EuiText>
      }
    />
  );
}
