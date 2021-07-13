/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrawlerPolicies, CrawlerRules, CrawlRule, CrawlerDomainFromServer } from './types';

import { crawlerDomainServerToClient, crawlerDataServerToClient } from './utils';

const DEFAULT_CRAWL_RULE: CrawlRule = {
  id: '-',
  policy: CrawlerPolicies.allow,
  rule: CrawlerRules.regex,
  pattern: '.*',
};

describe('crawlerDomainServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    const id = '507f1f77bcf86cd799439011';
    const name = 'moviedatabase.com';

    const defaultServerPayload = {
      id,
      name,
      created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
      document_count: 13,
      sitemaps: [],
      entry_points: [],
      crawl_rules: [],
    };

    const defaultClientPayload = {
      id,
      createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
      url: name,
      documentCount: 13,
      sitemaps: [],
      entryPoints: [],
      crawlRules: [],
    };

    expect(crawlerDomainServerToClient(defaultServerPayload)).toStrictEqual(defaultClientPayload);
    expect(
      crawlerDomainServerToClient({
        ...defaultServerPayload,
        last_visited_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...defaultClientPayload, lastCrawl: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlerDomainServerToClient({
        ...defaultServerPayload,
        default_crawl_rule: DEFAULT_CRAWL_RULE,
      })
    ).toStrictEqual({ ...defaultClientPayload, defaultCrawlRule: DEFAULT_CRAWL_RULE });
  });
});

describe('crawlerDataServerToClient', () => {
  it('converts all domains from the server form to their client form', () => {
    const domains: CrawlerDomainFromServer[] = [
      {
        id: 'x',
        name: 'moviedatabase.com',
        document_count: 13,
        created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
        sitemaps: [],
        entry_points: [],
        crawl_rules: [],
        default_crawl_rule: DEFAULT_CRAWL_RULE,
      },
      {
        id: 'y',
        name: 'swiftype.com',
        last_visited_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
        document_count: 40,
        created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
        sitemaps: [],
        entry_points: [],
        crawl_rules: [],
      },
    ];

    const output = crawlerDataServerToClient({
      domains,
    });

    expect(output.domains).toHaveLength(2);
    expect(output.domains[0]).toEqual(crawlerDomainServerToClient(domains[0]));
    expect(output.domains[1]).toEqual(crawlerDomainServerToClient(domains[1]));
  });
});
