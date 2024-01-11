/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, useParams } from 'react-router-dom';

import { useActions } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import {
  OLD_SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_INDEX_TAB_DETAIL_PATH,
  SEARCH_INDEX_TAB_PATH,
} from '../../routes';

import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import { SearchIndex } from './search_index';

export const SearchIndexRouter: React.FC = () => {
  const indexName = decodeURIComponent(useParams<{ indexName: string }>().indexName);
  const { setIndexName } = useActions(IndexNameLogic);
  const { stopFetchIndexPoll } = useActions(IndexViewLogic);
  useEffect(() => {
    const unmountName = IndexNameLogic.mount();
    const unmountView = IndexViewLogic.mount();
    return () => {
      stopFetchIndexPoll();
      unmountName();
      unmountView();
    };
  }, []);

  useEffect(() => {
    setIndexName(indexName);
  }, [indexName]);

  return (
    <Routes>
      <Route path={SEARCH_INDEX_PATH} exact>
        <SearchIndex />
      </Route>
      <Route path={SEARCH_INDEX_TAB_DETAIL_PATH}>
        <SearchIndex />
      </Route>
      <Route path={SEARCH_INDEX_TAB_PATH}>
        <SearchIndex />
      </Route>
      <Redirect
        from={OLD_SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH}
        to={`${SEARCH_INDEX_PATH}/domain_management/:domainId}`}
      />
    </Routes>
  );
};
