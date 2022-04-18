/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useRef, useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import {
  useEuiTheme,
  EuiFormLabel,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  euiSelectableTemplateSitewideRenderOptions,
} from '@elastic/eui';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import type {
  GlobalSearchPluginStart,
  GlobalSearchResult,
  GlobalSearchFindParams,
} from '@kbn/global-search-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { parseSearchParams } from '../search_syntax';
import { getSuggestions, SearchSuggestion } from '../suggestions';
import { resultToOption, suggestionToOption } from '../lib';
import { PopoverFooter } from './popover_footer';
import { PopoverPlaceholder } from './popover_placeholder';
import './search_bar.scss';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

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

interface SearchBarProps {
  globalSearch: GlobalSearchPluginStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  trackUiMetric: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  taggingApi?: SavedObjectTaggingPluginStart;
  basePathUrl: string;
  darkMode: boolean;
}

export const SearchBar: FC<SearchBarProps> = ({
  globalSearch,
  taggingApi,
  navigateToUrl,
  trackUiMetric,
  basePathUrl,
  darkMode,
}) => {
  const isMounted = useMountedState();
  const { euiTheme } = useEuiTheme();
  const [initialLoad, setInitialLoad] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);
  const [buttonRef, setButtonRef] = useState<HTMLDivElement | null>(null);
  const searchSubscription = useRef<Subscription | null>(null);
  const [options, _setOptions] = useState<EuiSelectableTemplateSitewideOption[]>([]);
  const [searchableTypes, setSearchableTypes] = useState<string[]>([]);
  const [showAppend, setShowAppend] = useState<boolean>(true);
  const UNKNOWN_TAG_ID = '__unknown__';

  useEffect(() => {
    if (initialLoad) {
      const fetch = async () => {
        const types = await globalSearch.getSearchableTypes();
        setSearchableTypes(types);
      };
      fetch();
    }
  }, [globalSearch, initialLoad]);

  const loadSuggestions = useCallback(
    (term: string) => {
      return getSuggestions({
        searchTerm: term,
        searchableTypes,
        tagCache: taggingApi?.cache,
      });
    },
    [taggingApi, searchableTypes]
  );

  const setOptions = useCallback(
    (
      _options: GlobalSearchResult[],
      suggestions: SearchSuggestion[],
      searchTagIds: string[] = []
    ) => {
      if (!isMounted()) {
        return;
      }

      _setOptions([
        ...suggestions.map(suggestionToOption),
        ..._options.map((option) =>
          resultToOption(
            option,
            searchTagIds?.filter((id) => id !== UNKNOWN_TAG_ID) ?? [],
            taggingApi?.ui.getTag
          )
        ),
      ]);
    },
    [isMounted, _setOptions, taggingApi]
  );

  useDebounce(
    () => {
      if (initialLoad) {
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
                (tagName) => taggingApi.ui.getTagIdFromName(tagName) ?? UNKNOWN_TAG_ID
              )
            : undefined;
        const searchParams: GlobalSearchFindParams = {
          term: rawParams.term,
          types: rawParams.filters.types,
          tags: tagIds,
        };
        // TODO technically a subtle bug here
        // this term won't be set until the next time the debounce is fired
        // so the SearchOption won't highlight anything if only one call is fired
        // in practice, this is hard to spot, unlikely to happen, and is a negligible issue
        setSearchTerm(rawParams.term ?? '');

        searchSubscription.current = globalSearch.find(searchParams, {}).subscribe({
          next: ({ results }) => {
            if (searchValue.length > 0) {
              aggregatedResults = [...results, ...aggregatedResults].sort(sortByScore);
              setOptions(aggregatedResults, suggestions, searchParams.tags);
              return;
            }

            // if searchbar is empty, filter to only applications and sort alphabetically
            results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

            aggregatedResults = [...results, ...aggregatedResults].sort(sortByTitle);

            setOptions(aggregatedResults, suggestions, searchParams.tags);
          },
          error: () => {
            // Not doing anything on error right now because it'll either just show the previous
            // results or empty results which is basically what we want anyways
            trackUiMetric(METRIC_TYPE.COUNT, 'unhandled_error');
          },
          complete: () => {},
        });
      }
    },
    350,
    [searchValue, loadSuggestions, searchableTypes, initialLoad]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === '/' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        trackUiMetric(METRIC_TYPE.COUNT, 'shortcut_used');
        if (searchRef) {
          searchRef.focus();
        } else if (buttonRef) {
          (buttonRef.children[0] as HTMLButtonElement).click();
        }
      }
    },
    [buttonRef, searchRef, trackUiMetric]
  );

  const onChange = useCallback(
    (selection: EuiSelectableTemplateSitewideOption[]) => {
      const selected = selection.find(({ checked }) => checked === 'on');
      if (!selected) {
        return;
      }

      // @ts-ignore - ts error is "union type is too complex to express"
      const { url, type, suggestion } = selected;

      // if the type is a suggestion, we change the query on the input and trigger a new search
      // by setting the searchValue (only setting the field value does not trigger a search)
      if (type === '__suggestion__') {
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
        clearField();
        searchRef.dispatchEvent(blurEvent);
      }
    },
    [trackUiMetric, navigateToUrl, searchRef]
  );

  const clearField = () => setSearchValue('');

  const emptyMessage = <PopoverPlaceholder darkMode={darkMode} basePath={basePathUrl} />;
  const placeholderText = i18n.translate('xpack.globalSearchBar.searchBar.placeholder', {
    defaultMessage: 'Find apps, content, and more. Ex: Discover',
  });
  const keyboardShortcutTooltip = `${i18n.translate(
    'xpack.globalSearchBar.searchBar.shortcutTooltip.description',
    {
      defaultMessage: 'Keyboard shortcut',
    }
  )}: ${
    isMac
      ? i18n.translate('xpack.globalSearchBar.searchBar.shortcutTooltip.macCommandDescription', {
          defaultMessage: 'Command + /',
        })
      : i18n.translate(
          'xpack.globalSearchBar.searchBar.shortcutTooltip.windowsCommandDescription',
          {
            defaultMessage: 'Control + /',
          }
        )
  }`;

  useEvent('keydown', onKeyDown);

  return (
    <EuiSelectableTemplateSitewide
      isPreFiltered
      onChange={onChange}
      options={options}
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchTerm)}
      searchProps={{
        value: searchValue,
        onInput: (e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value),
        'data-test-subj': 'nav-search-input',
        inputRef: setSearchRef,
        compressed: true,
        className: 'kbnSearchBar',
        'aria-label': placeholderText,
        placeholder: placeholderText,
        onFocus: () => {
          trackUiMetric(METRIC_TYPE.COUNT, 'search_focus');
          setInitialLoad(true);
          setShowAppend(false);
        },
        onBlur: () => {
          setShowAppend(true);
        },
        fullWidth: true,
        append: showAppend ? (
          <EuiFormLabel
            title={keyboardShortcutTooltip}
            css={{ fontFamily: euiTheme.font.familyCode }}
          >
            {isMac ? '⌘/' : '^/'}
          </EuiFormLabel>
        ) : undefined,
      }}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
      popoverProps={{
        'data-test-subj': 'nav-search-popover',
        panelClassName: 'navSearch__panel',
        repositionOnScroll: true,
        buttonRef: setButtonRef,
      }}
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
      popoverFooter={<PopoverFooter isMac={isMac} />}
    />
  );
};
