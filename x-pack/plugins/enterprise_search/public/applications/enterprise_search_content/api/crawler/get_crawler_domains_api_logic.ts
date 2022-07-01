/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

import { CrawlerDomains, CrawlerDomainsFromServer } from './types';

import { crawlerDomainsServerToClient } from './utils';

export interface GetCrawlerDomainsArgs {
  indexName: string;
  meta: Meta;
}

const getCrawlerDomains = async ({
  indexName,
  meta,
}: GetCrawlerDomainsArgs): Promise<CrawlerDomains> => {
  const query = {
    'page[current]': meta.page.current,
    'page[size]': meta.page.size,
  };

  const response = await HttpLogic.values.http.get<CrawlerDomainsFromServer>(
    `/internal/enterprise_search/indices/${indexName}/crawler/domains`,
    {
      query,
    }
  );

  return crawlerDomainsServerToClient(response);
};

export const GetCrawlerDomainsApiLogic = createApiLogic(['get_crawler_domains'], getCrawlerDomains);
