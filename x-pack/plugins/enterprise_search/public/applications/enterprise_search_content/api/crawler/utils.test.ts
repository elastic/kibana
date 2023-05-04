/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRAWL_EVENT,
  CRAWL_EVENT_FROM_SERVER,
  CRAWL_REQUEST,
  CRAWL_REQUEST_FROM_SERVER,
  CRAWL_REQUEST_WITH_DETAILS,
  CRAWL_REQUEST_WITH_DETAILS_FROM_SERVER,
} from './_mocks_/crawl_events.mock';
import { CRAWLER_DATA, CRAWLER_DATA_FROM_SERVER } from './_mocks_/crawler.mock';
import {
  CRAWLER_DOMAIN,
  CRAWLER_DOMAINS_WITH_META,
  CRAWLER_DOMAINS_WITH_META_FROM_SERVER,
  CRAWLER_DOMAIN_CONFIG,
  CRAWLER_DOMAIN_CONFIG_FROM_SERVER,
  CRAWLER_DOMAIN_FROM_SERVER,
  CRAWL_RULE,
} from './_mocks_/crawler_domains.mock';

import { CrawlerDomainValidationStep, CrawlerDomainValidationResultFromServer } from './types';

import {
  crawlerDomainServerToClient,
  crawlerDataServerToClient,
  crawlDomainValidationToResult,
  crawlEventServerToClient,
  crawlRequestServerToClient,
  crawlRequestWithDetailsServerToClient,
  domainConfigServerToClient,
  crawlerDomainsWithMetaServerToClient,
} from './utils';

describe('crawlerDomainServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    expect(crawlerDomainServerToClient(CRAWLER_DOMAIN_FROM_SERVER)).toStrictEqual(CRAWLER_DOMAIN);
    expect(
      crawlerDomainServerToClient({
        ...CRAWLER_DOMAIN_FROM_SERVER,
        last_visited_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWLER_DOMAIN, lastCrawl: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlerDomainServerToClient({
        ...CRAWLER_DOMAIN_FROM_SERVER,
        default_crawl_rule: CRAWL_RULE,
      })
    ).toStrictEqual({ ...CRAWLER_DOMAIN, defaultCrawlRule: CRAWL_RULE });
  });
});

describe('crawlRequestServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    expect(crawlRequestServerToClient(CRAWL_REQUEST_FROM_SERVER)).toStrictEqual(CRAWL_REQUEST);
    expect(
      crawlRequestServerToClient({
        ...CRAWL_REQUEST_FROM_SERVER,
        began_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWL_REQUEST, beganAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlRequestServerToClient({
        ...CRAWL_REQUEST_FROM_SERVER,
        completed_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWL_REQUEST, completedAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
  });
});

describe('crawlRequestWithDetailsServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    expect(
      crawlRequestWithDetailsServerToClient(CRAWL_REQUEST_WITH_DETAILS_FROM_SERVER)
    ).toStrictEqual(CRAWL_REQUEST_WITH_DETAILS);
    expect(
      crawlRequestWithDetailsServerToClient({
        ...CRAWL_REQUEST_WITH_DETAILS_FROM_SERVER,
        began_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWL_REQUEST_WITH_DETAILS, beganAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlRequestWithDetailsServerToClient({
        ...CRAWL_REQUEST_WITH_DETAILS_FROM_SERVER,
        completed_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({
      ...CRAWL_REQUEST_WITH_DETAILS,
      completedAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
    });
  });
});

describe('crawlEventServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    expect(crawlEventServerToClient(CRAWL_EVENT_FROM_SERVER)).toStrictEqual(CRAWL_EVENT);
    expect(
      crawlEventServerToClient({
        ...CRAWL_EVENT_FROM_SERVER,
        began_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWL_EVENT, beganAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlEventServerToClient({
        ...CRAWL_EVENT_FROM_SERVER,
        completed_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...CRAWL_EVENT, completedAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
  });
});

describe('crawlerDataServerToClient', () => {
  it('converts all data from the server form to their client form', () => {
    expect(crawlerDataServerToClient(CRAWLER_DATA_FROM_SERVER)).toStrictEqual(CRAWLER_DATA);
  });
});

describe('crawlDomainValidationToResult', () => {
  it('handles results with warnings', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      results: [
        {
          comment: 'A warning, not failure',
          name: '-',
          result: 'warning',
        },
      ],
      valid: true,
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      blockingFailure: false,
      message: 'A warning, not failure',
      state: 'warning',
    } as CrawlerDomainValidationStep);
  });

  it('handles valid results, without warnings', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      results: [
        {
          comment: 'Something happened',
          name: '-',
          result: 'ok',
        },
      ],
      valid: true,
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      state: 'valid',
    } as CrawlerDomainValidationStep);
  });

  it('handes invalid results', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      results: [
        {
          comment: 'Something unexpected happened',
          name: '-',
          result: 'failure',
        },
      ],
      valid: false,
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      blockingFailure: true,
      message: 'Something unexpected happened',
      state: 'invalid',
    } as CrawlerDomainValidationStep);
  });
});

describe('domainConfigServerToClient', () => {
  it('converts the domain config payload into properties matching our code style', () => {
    expect(domainConfigServerToClient(CRAWLER_DOMAIN_CONFIG_FROM_SERVER)).toEqual(
      CRAWLER_DOMAIN_CONFIG
    );
  });
});

describe('crawlerDomainsWithMetaServerToClient', () => {
  it('converts the domain config payload into properties matching our code style', () => {
    expect(crawlerDomainsWithMetaServerToClient(CRAWLER_DOMAINS_WITH_META_FROM_SERVER)).toEqual(
      CRAWLER_DOMAINS_WITH_META
    );
  });
});
