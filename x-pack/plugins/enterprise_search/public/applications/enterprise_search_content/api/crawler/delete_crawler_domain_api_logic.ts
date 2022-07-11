/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

import { CrawlerDomain } from './types';

export interface GetCrawlerDomainsArgs {
  domain: CrawlerDomain;
  indexName: string;
}

export const deleteCrawlerDomain = async ({ domain, indexName }: GetCrawlerDomainsArgs) => {
  await HttpLogic.values.http.delete(
    `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domain.id}`
  );

  return {
    domain,
  };
};

export const DeleteCrawlerDomainApiLogic = createApiLogic(
  ['delete_crawler_domain'],
  deleteCrawlerDomain
);
