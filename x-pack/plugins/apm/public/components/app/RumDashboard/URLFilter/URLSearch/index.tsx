/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
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
          highlightSearchString: true,
        },
        {
          text: I18LABELS.pageLoadDuration + ': ' + item.pld + ' ms',
          type: 'deployment',
          highlightSearchString: true,
        },
      ],
      url: item.url,
      checked: checkedUrls?.includes(item.url) ? 'on' : null,
    })
  );

  return (
    <EuiSelectableTemplateSitewide
      data-test-subj="csmSearchFieldSuggestion"
      singleSelection={false}
      isLoading={status !== 'success'}
      onChange={onChange}
      options={items}
      searchProps={{
        placeholder: I18LABELS.searchByUrl,
        onSearch: setSearchValue,
      }}
      popoverProps={{
        closePopover: () => {
          onFilterChange(checkedUrls);
        },
      }}
      popoverTitle={searchValue ? I18LABELS.searchResults : I18LABELS.topPages}
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
