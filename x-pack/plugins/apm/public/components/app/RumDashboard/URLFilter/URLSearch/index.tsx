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
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import React, { useEffect, useState, FormEvent } from 'react';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { I18LABELS } from '../../translations';

interface Props {
  onChange: (value: string[]) => void;
}

export function URLSearch({ onChange: onFilterChange }: Props) {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const [searchValue, setSearchValue] = useState('');

  const [debouncedValue, setDebouncedValue] = useState('');

  useDebounce(
    () => {
      setSearchValue(debouncedValue);
    },
    250,
    [debouncedValue]
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
    // @ts-expect-error
    const clickedItems = updatedOptions.filter(
      (option) => option.checked === 'on'
    );

    setCheckedUrls(clickedItems.map((item) => item.url));
  };

  // @ts-expect-error
  const items: EuiSelectableTemplateSitewideOption[] = (data ?? []).map(
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
          {searchValue ? I18LABELS.searchResults : I18LABELS.topPages}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            disabled={searchValue === ''}
            onClick={() => window.alert('Button clicked')}
          >
            Match this query
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiSelectableTemplateSitewide
      data-test-subj="csmSearchFieldSuggestion"
      singleSelection={false}
      isLoading={status !== 'success'}
      onChange={onChange}
      options={items}
      searchProps={{
        placeholder: I18LABELS.searchByUrl,
        onInput: onInputChange,
      }}
      popoverProps={{
        closePopover: () => {
          onFilterChange(checkedUrls);
        },
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
  );
}
