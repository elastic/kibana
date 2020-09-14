/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

export function URLSearch() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const [searchValue, setSearchValue] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/url-search',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchValue,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, searchValue]
  );

  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    window.addEventListener('keydown', onWindowKeyDown);

    return function cleanup() {
      window.removeEventListener('resize', onWindowKeyDown);
    };
  });

  const onWindowKeyDown = (e: any) => {
    if (e.metaKey && e.key.toLowerCase() === 'k') {
      window.addEventListener('keyup', onWindowKeyUp);
    }
  };

  const onWindowKeyUp = () => {
    if (searchRef) searchRef.focus();
    window.removeEventListener('keyup', onWindowKeyUp);
  };

  const onKeyUpCapture = (e: any) => {
    setSearchValue(e.currentTarget.value);
  };

  /**
   * Do something with the selection based on the found option with `checked: on`
   */
  const onChange = (updatedOptions: EuiSelectableTemplateSitewideOption[]) => {
    const clickedItem = updatedOptions.find(
      (option) => option.checked === 'on'
    );
    if (!clickedItem) return;
    if (clickedItem && clickedItem.url) {
      return;
    }
  };
  const items = (data ?? []).map((item, ind) => ({
    label: item.url,
    key: item.url,
    avatar: {
      name: 'Total Blocking Time',
    },
    icon: {
      type: 'globe',
    },
    meta: [
      {
        text: 'Views: ' + item.count,
        type: 'deployment',
        highlightSearchString: true,
      },
      {
        text: 'Page load duration: ' + item.pld + ' ms',
        type: 'deployment',
        highlightSearchString: false,
      },
    ],
    url: item.url,
  }));
  return (
    <EuiSelectableTemplateSitewide
      isLoading={status !== 'success'}
      onChange={onChange}
      options={items}
      searchProps={{
        onKeyUpCapture,
        placeholder: 'Search for url',
        inputRef: setSearchRef,
      }}
      popoverTitle={searchValue ? 'Search Results' : 'Top 10 pages'}
    />
  );
}
