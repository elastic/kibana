/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { encode, RisonValue } from 'rison-node';
import styled from 'styled-components';
import type { Query } from '@kbn/es-query';
import { TimeHistory } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { urlFromQueryParams } from '../url_from_query_params';
import { useEndpointSelector } from '../hooks';
import * as selectors from '../../store/selectors';
import { clone } from '../../models/index_pattern';

const AdminQueryBar = styled.div`
  .globalQueryBar {
    padding: 0;
  }
`;

export const AdminSearchBar = memo(() => {
  const history = useHistory();
  const { admin_query: _, ...queryParams } = useEndpointSelector(selectors.uiQueryParams);
  const searchBarIndexPatterns = useEndpointSelector(selectors.patterns);
  const searchBarQuery = useEndpointSelector(selectors.searchBarQuery);
  const clonedIndexPatterns = useMemo(
    () => searchBarIndexPatterns.map((pattern) => clone(pattern)),
    [searchBarIndexPatterns]
  );

  const onQuerySubmit = useCallback(
    (params: { query?: Query }) => {
      history.push(
        urlFromQueryParams({
          ...queryParams,
          // if query is changed, reset back to first page
          // so that user is not (possibly) being left on an invalid page
          page_index: params.query?.query === searchBarQuery.query ? queryParams.page_index : '0',
          ...(params.query?.query.trim()
            ? { admin_query: encode(params.query as unknown as RisonValue) }
            : {}),
        })
      );
    },
    [history, queryParams, searchBarQuery.query]
  );

  const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);

  return (
    <div>
      {searchBarIndexPatterns && searchBarIndexPatterns.length > 0 && (
        <AdminQueryBar>
          <SearchBar
            dataTestSubj="adminSearchBar"
            query={searchBarQuery}
            indexPatterns={clonedIndexPatterns as DataView[]}
            timeHistory={timeHistory}
            onQuerySubmit={onQuerySubmit}
            fillSubmitButton={true}
            isLoading={false}
            iconType="search"
            showFilterBar={false}
            showDatePicker={false}
            showQueryBar={true}
            showQueryInput={true}
          />
        </AdminQueryBar>
      )}
    </div>
  );
});

AdminSearchBar.displayName = 'AdminSearchBar';
