/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiImage,
  EuiSelectableMessage,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  EuiText,
} from '@elastic/eui';
import { METRIC_TYPE, UiStatsMetricType } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import React, { useCallback, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import { GlobalSearchPluginStart, GlobalSearchResult } from '../../../global_search/public';

interface Props {
  globalSearch: GlobalSearchPluginStart['find'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  trackUiMetric: (metricType: UiStatsMetricType, eventName: string | string[]) => void;
  basePathUrl: string;
  darkMode: boolean;
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

const sortByScore = (a: GlobalSearchResult, b: GlobalSearchResult): number => {
  if (a.score < b.score) return 1;
  if (a.score > b.score) return -1;
  return 0;
};

const sortByTitle = (a: GlobalSearchResult, b: GlobalSearchResult): number => {
  const titleA = a.title.toUpperCase(); // ignore upper and lowercase
  const titleB = b.title.toUpperCase(); // ignore upper and lowercase
  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;
  return 0;
};

const resultToOption = (result: GlobalSearchResult): EuiSelectableTemplateSitewideOption => {
  const { id, title, url, icon, type, meta } = result;
  const option: EuiSelectableTemplateSitewideOption = {
    key: id,
    label: title,
    url,
    type,
  };

  if (icon) {
    option.icon = { type: icon };
  }

  if (type === 'application') {
    option.meta = [{ text: meta?.categoryLabel as string }];
  } else {
    option.meta = [{ text: cleanMeta(type) }];
  }

  return option;
};

export function SearchBar({
  globalSearch,
  navigateToUrl,
  trackUiMetric,
  basePathUrl,
  darkMode,
}: Props) {
  const isMounted = useMountedState();
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);
  const searchSubscription = useRef<Subscription | null>(null);
  const [options, _setOptions] = useState([] as EuiSelectableTemplateSitewideOption[]);
  const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

  const setOptions = useCallback(
    (_options: GlobalSearchResult[]) => {
      if (!isMounted()) {
        return;
      }

      _setOptions(_options.map(resultToOption));
    },
    [isMounted, _setOptions]
  );

  useDebounce(
    () => {
      // cancel pending search if not completed yet
      if (searchSubscription.current) {
        searchSubscription.current.unsubscribe();
        searchSubscription.current = null;
      }

      let arr: GlobalSearchResult[] = [];
      if (searchValue.length !== 0) {
        trackUiMetric(METRIC_TYPE.COUNT, 'search_request');
      }
      searchSubscription.current = globalSearch(searchValue, {}).subscribe({
        next: ({ results }) => {
          if (searchValue.length > 0) {
            arr = [...results, ...arr].sort(sortByScore);
            setOptions(arr);
            return;
          }

          // if searchbar is empty, filter to only applications and sort alphabetically
          results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

          arr = [...results, ...arr].sort(sortByTitle);

          setOptions(arr);
        },
        error: () => {
          // Not doing anything on error right now because it'll either just show the previous
          // results or empty results which is basically what we want anyways
          trackUiMetric(METRIC_TYPE.COUNT, 'unhandled_error');
        },
        complete: () => {},
      });
    },
    350,
    [searchValue]
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      trackUiMetric(METRIC_TYPE.COUNT, 'shortcut_used');
      if (searchRef) {
        searchRef.focus();
      } else if (buttonRef) {
        (buttonRef.children[0] as HTMLButtonElement).click();
      }
    }
  };

  const onChange = (selection: EuiSelectableTemplateSitewideOption[]) => {
    const selected = selection.find(({ checked }) => checked === 'on');
    if (!selected) {
      return;
    }

    // @ts-ignore - ts error is "union type is too complex to express"
    const { url, type } = selected;

    // errors in tracking should not prevent selection behavior
    try {
      if (type === 'application') {
        const key = selected.keys ?? 'unknown';
        trackUiMetric(METRIC_TYPE.CLICK, [
          'user_navigated_to_application',
          `user_navigated_to_application_${key.toLowerCase().replaceAll(' ', '_')}`, // which application
        ]);
      } else {
        trackUiMetric(METRIC_TYPE.CLICK, [
          'user_navigated_to_saved_object',
          `user_navigated_to_saved_object_${type}`, // which type of saved object
        ]);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error trying to track searchbar metrics', e);
    }

    navigateToUrl(url);

    (document.activeElement as HTMLElement).blur();
    if (searchRef) {
      clearField(searchRef);
      searchRef.dispatchEvent(blurEvent);
    }
  };

  const emptyMessage = (
    <EuiSelectableMessage style={{ minHeight: 300 }}>
      <EuiImage
        alt={i18n.translate('xpack.globalSearchBar.searchBar.noResultsImageAlt', {
          defaultMessage: 'Illustration of black hole',
        })}
        size="fullWidth"
        url={`${basePathUrl}illustration_product_no_search_results_${
          darkMode ? 'dark' : 'light'
        }.svg`}
      />
      <EuiText size="m">
        <p>
          <FormattedMessage
            id="xpack.globalSearchBar.searchBar.noResultsHeading"
            defaultMessage="No results found"
          />
        </p>
      </EuiText>
      <p>
        <FormattedMessage
          id="xpack.globalSearchBar.searchBar.noResults"
          defaultMessage="Try searching for applications, dashboards, visualizations, and more."
        />
      </p>
    </EuiSelectableMessage>
  );

  useEvent('keydown', onKeyDown);

  return (
    <EuiSelectableTemplateSitewide
      onChange={onChange}
      options={options}
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      popoverButton={
        <EuiHeaderSectionItemButton
          aria-label={i18n.translate(
            'xpack.globalSearchBar.searchBar.mobileSearchButtonAriaLabel',
            { defaultMessage: 'Site-wide search' }
          )}
        >
          <EuiIcon type="search" size="m" />
        </EuiHeaderSectionItemButton>
      }
      searchProps={{
        onKeyUpCapture: (e: React.KeyboardEvent<HTMLInputElement>) =>
          setSearchValue(e.currentTarget.value),
        'data-test-subj': 'header-search',
        inputRef: setSearchRef,
        compressed: true,
        placeholder: i18n.translate('xpack.globalSearchBar.searchBar.placeholder', {
          defaultMessage: 'Search Elastic',
        }),
        onFocus: () => {
          trackUiMetric(METRIC_TYPE.COUNT, 'search_focus');
        },
      }}
      popoverProps={{
        repositionOnScroll: true,
        buttonRef: setButtonRef,
      }}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
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
              id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutDetail"
              defaultMessage="{shortcutDescription}{commandDescription}"
              values={{
                shortcutDescription: (
                  <EuiFlexItem grow={false}>
                    <FormattedMessage
                      id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutInstructionDescription"
                      defaultMessage="Shortcut"
                    />
                  </EuiFlexItem>
                ),
                commandDescription: (
                  <EuiFlexItem grow={false}>
                    <EuiBadge>
                      {isMac ? (
                        <FormattedMessage
                          id="xpack.globalSearchBar.searchBar.shortcutDescription.macCommandDescription"
                          defaultMessage="Command + /"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.globalSearchBar.searchBar.shortcutDescription.windowsCommandDescription"
                          defaultMessage="Control + /"
                        />
                      )}
                    </EuiBadge>
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
