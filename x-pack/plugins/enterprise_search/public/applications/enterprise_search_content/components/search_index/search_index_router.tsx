/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch, useParams } from 'react-router-dom';

import { useActions } from 'kea';

import {
  SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_INDEX_TAB_PATH,
} from '../../routes';

import { CrawlerDomainDetail } from '../crawler_domain_detail/crawler_domain_detail';

import { IndexNameLogic } from './index_name_logic';
import { SearchIndex } from './search_index';

export const SearchIndexRouter: React.FC = () => {
  const { indexName } = useParams<{ indexName: string }>();

  const indexNameLogic = IndexNameLogic({ indexName });
  const { setIndexName } = useActions(indexNameLogic);
  // const { indexName: indexNameFromLogic } = useValues(indexNameLogic);

  useEffect(() => {
    setIndexName(indexName);
  }, [indexName]);

  return (
    <Switch>
      <Route path={SEARCH_INDEX_PATH} exact>
        <SearchIndex />
      </Route>
      <Route path={SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH} exact>
        <CrawlerDomainDetail />
      </Route>
      <Route path={SEARCH_INDEX_TAB_PATH}>
        <SearchIndex />
      </Route>
    </Switch>
  );
};
