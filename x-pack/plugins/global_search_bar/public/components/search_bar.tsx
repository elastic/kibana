/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  euiSelectableTemplateSitewideRenderOptions,
  useEuiTheme,
} from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import type { GlobalSearchFindParams, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useEvent from 'react-use/lib/useEvent';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import { blurEvent, CLICK_METRIC, COUNT_METRIC, getClickMetric, isMac, sort } from '.';
import { resultToOption, suggestionToOption } from '../lib';
import { parseSearchParams } from '../search_syntax';
import { i18nStrings } from '../strings';
import { getSuggestions, SearchSuggestion } from '../suggestions';
import { PopoverFooter } from './popover_footer';
import { PopoverPlaceholder } from './popover_placeholder';
import './search_bar.scss';
import { SearchBarProps } from './types';

const NoMatchesMessage = (props: { basePathUrl: string; darkMode: boolean }) => (
  <PopoverPlaceholder darkMode={props.darkMode} basePath={props.basePathUrl} />
);

const EmptyMessage = () => (
  <EuiFlexGroup direction="column" justifyContent="center" style={{ minHeight: '300px' }}>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const SearchBar: FC<SearchBarProps> = ({
  globalSearch,
  taggingApi,
  navigateToUrl,
  trackUiMetric,
  ...props
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
          trackUiMetric(METRIC_TYPE.COUNT, COUNT_METRIC.SEARCH_REQUEST);
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
              aggregatedResults = [...results, ...aggregatedResults].sort(sort.byScore);
              setOptions(aggregatedResults, suggestions, searchParams.tags);
              return;
            }

            // if searchbar is empty, filter to only applications and sort alphabetically
            results = results.filter(({ type }: GlobalSearchResult) => type === 'application');

            aggregatedResults = [...results, ...aggregatedResults].sort(sort.byTitle);

            setOptions(aggregatedResults, suggestions, searchParams.tags);
          },
          error: () => {
            // Not doing anything on error right now because it'll either just show the previous
            // results or empty results which is basically what we want anyways
            trackUiMetric(METRIC_TYPE.COUNT, COUNT_METRIC.UNHANDLED_ERROR);
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
        trackUiMetric(METRIC_TYPE.COUNT, COUNT_METRIC.SHORTCUT_USED);
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
          const key = selected.key ?? 'unknown';
          const application = `${key.toLowerCase().replaceAll(' ', '_')}`;
          trackUiMetric(
            METRIC_TYPE.CLICK,
            getClickMetric(CLICK_METRIC.USER_NAVIGATED_TO_APPLICATION, application)
          );
        } else {
          trackUiMetric(
            METRIC_TYPE.CLICK,
            getClickMetric(CLICK_METRIC.USER_NAVIGATED_TO_SAVED_OBJECT, type)
          );
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

  const keyboardShortcutTooltip = `${i18nStrings.keyboardShortcutTooltip.prefix}: ${
    isMac ? i18nStrings.keyboardShortcutTooltip.onMac : i18nStrings.keyboardShortcutTooltip.onNotMac
  }`;

  useEvent('keydown', onKeyDown);

  return (
    <EuiSelectableTemplateSitewide
      isPreFiltered
      onChange={onChange}
      options={options}
      className="kbnSearchBar"
      popoverButtonBreakpoints={['xs', 's']}
      singleSelection={true}
      renderOption={(option) => euiSelectableTemplateSitewideRenderOptions(option, searchTerm)}
      searchProps={{
        value: searchValue,
        onInput: (e: React.UIEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value),
        'data-test-subj': 'nav-search-input',
        inputRef: setSearchRef,
        compressed: true,
        'aria-label': i18nStrings.placeholderText,
        placeholder: i18nStrings.placeholderText,
        onFocus: () => {
          trackUiMetric(METRIC_TYPE.COUNT, COUNT_METRIC.SEARCH_FOCUS);
          setInitialLoad(true);
          setShowAppend(false);
        },
        onBlur: () => {
          setShowAppend(!searchValue.length);
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
      emptyMessage={<EmptyMessage />}
      noMatchesMessage={<NoMatchesMessage {...props} />}
      popoverProps={{
        'data-test-subj': 'nav-search-popover',
        panelClassName: 'navSearch__panel',
        repositionOnScroll: true,
        buttonRef: setButtonRef,
        panelStyle: { marginTop: '6px' },
      }}
      popoverButton={
        <EuiHeaderSectionItemButton aria-label={i18nStrings.popoverButton}>
          <EuiIcon type="search" size="m" />
        </EuiHeaderSectionItemButton>
      }
      popoverFooter={<PopoverFooter isMac={isMac} />}
    />
  );
};
