/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCode,
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
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import {
  GlobalSearchPluginStart,
  GlobalSearchResult,
  GlobalSearchFindParams,
} from '../../../global_search/public';
import { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';
import { parseSearchParams } from '../search_syntax';
import { getSuggestions, SearchSuggestion } from '../suggestions';

import './search_bar.scss';

interface Props {
  globalSearch: GlobalSearchPluginStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  trackUiMetric: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  taggingApi?: SavedObjectTaggingPluginStart;
  basePathUrl: string;
  darkMode: boolean;
}

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const setFieldValue = (field: HTMLInputElement, value: string) => {
  const nativeInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const nativeInputValueSetter = nativeInputValue ? nativeInputValue.set : undefined;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, value);
  }
  field.dispatchEvent(new Event('change'));
};

const clearField = (field: HTMLInputElement) => setFieldValue(field, '');

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
  // only displaying icons for applications
  const useIcon = type === 'application';
  const option: EuiSelectableTemplateSitewideOption = {
    key: id,
    label: title,
    url,
    type,
    icon: { type: useIcon && icon ? icon : 'empty' },
    'data-test-subj': `nav-search-option`,
  };

  if (type === 'application') {
    option.meta = [{ text: (meta?.categoryLabel as string) ?? '' }];
  } else {
    option.meta = [{ text: cleanMeta(type) }];
  }

  return option;
};

const suggestionToOption = (suggestion: SearchSuggestion): EuiSelectableTemplateSitewideOption => {
  const { key, label, description, icon, suggestedSearch } = suggestion;
  return {
    key,
    label,
    type: '__suggestion__',
    icon: { type: icon },
    suggestion: suggestedSearch,
    meta: [{ text: description }],
    'data-test-subj': `nav-search-option`,
  };
};

export function SearchBar({
  globalSearch,
  taggingApi,
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
  const [options, _setOptions] = useState<EuiSelectableTemplateSitewideOption[]>([]);
  const [searchableTypes, setSearchableTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const types = await globalSearch.getSearchableTypes();
      setSearchableTypes(types);
    };
    fetch();
  }, [globalSearch]);

  const loadSuggestions = useCallback(
    (searchTerm: string) => {
      return getSuggestions({
        searchTerm,
        searchableTypes,
        tagCache: taggingApi?.cache,
      });
    },
    [taggingApi, searchableTypes]
  );

  const setOptions = useCallback(
    (_options: GlobalSearchResult[], suggestions: SearchSuggestion[]) => {
      if (!isMounted()) {
        return;
      }
      _setOptions([...suggestions.map(suggestionToOption), ..._options.map(resultToOption)]);
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

      const suggestions = loadSuggestions(searchValue);

      let aggregatedResults: GlobalSearchResult[] = [];
      if (searchValue.length !== 0) {
        trackUiMetric(METRIC_TYPE.COUNT, 'search_request');
      }

      const rawParams = parseSearchParams(searchValue);
      const tagIds =
        taggingApi && rawParams.filters.tags
          ? rawParams.filters.tags.map(
              (tagName) => taggingApi.ui.getTagIdFromName(tagName) ?? '__unknown__'
            )
          : undefined;
      const searchParams: GlobalSearchFindParams = {
        term: rawParams.term,
        types: rawParams.filters.types,
        tags: tagIds,
      };

      searchSubscription.current = globalSearch.find(searchParams, {}).subscribe({
        next: ({ results }) => {
          if (searchValue.length > 0) {
            aggregatedResults = [...results, ...aggregatedResults].sort(sortByScore);
            setOptions(aggregatedResults, suggestions);
            return;
          }

          // if searchbar is empty, filter to only applications and sort alphabetically
          results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

          aggregatedResults = [...results, ...aggregatedResults].sort(sortByTitle);

          setOptions(aggregatedResults, suggestions);
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
    [searchValue, loadSuggestions]
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
    const { url, type, suggestion } = selected;

    // if the type is a suggestion, we change the query on the input and trigger a new search
    // by setting the searchValue (only setting the field value does not trigger a search)
    if (type === '__suggestion__') {
      setFieldValue(searchRef!, suggestion);
      setSearchValue(suggestion);
      return;
    }

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
    <EuiSelectableMessage style={{ minHeight: 300 }} data-test-subj="nav-search-no-results">
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
      isPreFiltered
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
        'data-test-subj': 'nav-search-input',
        inputRef: setSearchRef,
        compressed: true,
        className: 'kbnSearchBar',
        placeholder: i18n.translate('xpack.globalSearchBar.searchBar.placeholder', {
          defaultMessage: 'Search Elastic',
        }),
        onFocus: () => {
          trackUiMetric(METRIC_TYPE.COUNT, 'search_focus');
        },
      }}
      popoverProps={{
        'data-test-subj': 'nav-search-popover',
        panelClassName: 'navSearch__panel',
        repositionOnScroll: true,
        buttonRef: setButtonRef,
      }}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
      popoverFooter={
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
          wrap
        >
          <EuiFlexItem>
            <EuiText color="subdued" size="xs">
              <p>
                <FormattedMessage
                  id="xpack.globalSearchBar.searchBar.helpText.helpTextPrefix"
                  defaultMessage="Filter by"
                />
                &nbsp;
                <EuiCode>type:</EuiCode>&nbsp;
                <FormattedMessage
                  id="xpack.globalSearchBar.searchBar.helpText.helpTextConjunction"
                  defaultMessage="or"
                />
                &nbsp;
                <EuiCode>tag:</EuiCode>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="xs">
              <p>
                <FormattedMessage
                  id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutDetail"
                  defaultMessage="{shortcutDescription} {commandDescription}"
                  values={{
                    shortcutDescription: (
                      <FormattedMessage
                        id="xpack.globalSearchBar.searchBar.shortcutDescription.shortcutInstructionDescription"
                        defaultMessage="Shortcut"
                      />
                    ),
                    commandDescription: (
                      <EuiCode>
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
                      </EuiCode>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
