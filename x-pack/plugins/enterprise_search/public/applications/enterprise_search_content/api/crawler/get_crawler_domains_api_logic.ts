/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

import { CrawlerDomainsWithMetaFromServer } from './types';

import { crawlerDomainsWithMetaServerToClient } from './utils';

export interface GetCrawlerDomainsArgs {
  indexName: string;
  meta: Meta;
}

export const getCrawlerDomains = async ({ indexName, meta }: GetCrawlerDomainsArgs) => {
  const query = {
    'page[current]': meta.page.current,
    'page[size]': meta.page.size,
  };

  const response = await HttpLogic.values.http.get<CrawlerDomainsWithMetaFromServer>(
    `/internal/enterprise_search/indices/${indexName}/crawler/domains`,
    {
      query,
    }
  );

  return crawlerDomainsWithMetaServerToClient(response);
};

export const GetCrawlerDomainsApiLogic = createApiLogic(['get_crawler_domains'], getCrawlerDomains);
