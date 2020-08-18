/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { encode, RisonValue } from 'rison-node';
import styled from 'styled-components';
import { Query, SearchBar, TimeHistory } from '../../../../../../src/plugins/data/public/';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { urlFromQueryParams } from '../pages/endpoint_hosts/view/url_from_query_params';
import { useEndpointSelector } from '../pages/endpoint_hosts/view/hooks';
import * as selectors from '../pages/endpoint_hosts/store/selectors';
import { clone } from '../pages/endpoint_hosts/models/index_pattern';

const AdminQueryBar = styled.div`
  margin-bottom: ${(props) => props.theme.eui.ruleMargins.marginMedium};
  .globalQueryBar {
    padding: 0;
  }
`;

export const AdminSearchBar = memo(() => {
  const history = useHistory();
  const queryParams = useEndpointSelector(selectors.uiQueryParams);
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
          admin_query: encode((params.query as unknown) as RisonValue),
        })
      );
    },
    [history, queryParams]
  );

  return (
    <div>
      {searchBarIndexPatterns && searchBarIndexPatterns.length > 0 && (
        <AdminQueryBar>
          <SearchBar
            dataTestSubj="adminSearchBar"
            query={searchBarQuery}
            indexPatterns={clonedIndexPatterns}
            timeHistory={new TimeHistory(new Storage(localStorage))}
            onQuerySubmit={onQuerySubmit}
            isLoading={false}
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
