/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
  EuiTitle,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import React, { useEffect, useState, FormEvent, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { I18LABELS } from '../../translations';
import { fromQuery, toQuery } from '../../../../shared/Links/url_helpers';

interface Props {
  onChange: (value: string[]) => void;
}

export function URLSearch({ onChange: onFilterChange }: Props) {
  const history = useHistory();

  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const [searchValue, setSearchValue] = useState('');

  const [forceClosePopover, setForceClosePopover] = useState(false);

  const [debouncedValue, setDebouncedValue] = useState('');

  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const onInputFocus = () => {
    setForceClosePopover(false);
  };

  useEffect(() => {
    if (searchRef) {
      searchRef.addEventListener('focus', onInputFocus);
    }
    return () => {
      searchRef?.removeEventListener('focus', onInputFocus);
    };
  }, [searchRef]);

  useDebounce(
    () => {
      setSearchValue(debouncedValue);
    },
    250,
    [debouncedValue]
  );

  const updateSearchTerm = useCallback(
    (searchTermN: string) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          searchTerm: searchTermN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  const [checkedUrls, setCheckedUrls] = useState<string[]>([]);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        const { transactionUrl, ...restFilters } = uiFilters;

        return callApmApi({
          pathname: '/api/apm/rum-client/url-search',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(restFilters),
              urlQuery: searchValue,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, searchValue]
  );

  useEffect(() => {
    setCheckedUrls(uiFilters.transactionUrl || []);
  }, [uiFilters]);

  const onChange = (updatedOptions: EuiSelectableTemplateSitewideOption[]) => {
    const clickedItems = updatedOptions.filter(
      (option) => option.checked === 'on'
    );

    setCheckedUrls(clickedItems.map((item) => item.url));
  };

  // @ts-expect-error
  const items: EuiSelectableTemplateSitewideOption[] = (data?.items ?? []).map(
    (item) => ({
      label: item.url,
      key: item.url,
      meta: [
        {
          text: I18LABELS.pageViews + ': ' + item.count,
          type: 'deployment',
          highlightSearchString: false,
        },
        {
          text: I18LABELS.pageLoadDuration + ': ' + item.pld + ' ms',
          type: 'deployment',
          highlightSearchString: false,
        },
      ],
      url: item.url,
      checked: checkedUrls?.includes(item.url) ? 'on' : null,
    })
  );

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    setDebouncedValue(e.currentTarget.value);
  };

  function PopOverTitle() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          {searchValue
            ? (data?.total ?? 0) + ' ' + I18LABELS.searchResults
            : I18LABELS.topPages}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            disabled={searchValue === ''}
            onClick={() => {
              updateSearchTerm(searchValue);
              setForceClosePopover(true);
            }}
          >
            Match this query
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{I18LABELS.url}</h4>
      </EuiTitle>
      <EuiSelectableTemplateSitewide
        data-test-subj="csmSearchFieldSuggestion"
        singleSelection={false}
        isLoading={status !== 'success'}
        onChange={onChange}
        options={items}
        searchProps={{
          placeholder: I18LABELS.searchByUrl,
          onInput: onInputChange,
          inputRef: setSearchRef,
        }}
        popoverProps={{
          closePopover: () => {
            onFilterChange(checkedUrls);
          },
          ...(forceClosePopover ? { isOpen: false } : {}),
        }}
        popoverTitle={<PopOverTitle />}
        listProps={{
          showIcons: true,
          onFocusBadge: {
            iconSide: 'right',
            children: I18LABELS.select,
          },
        }}
      />
    </>
  );
}
