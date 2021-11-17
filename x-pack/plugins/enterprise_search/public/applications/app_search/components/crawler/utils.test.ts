/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrawlerPolicies,
  CrawlerRules,
  CrawlRule,
  CrawlerDomainFromServer,
  CrawlerDomainValidationStep,
  CrawlerDomainValidationResultFromServer,
  CrawlRequestFromServer,
  CrawlerStatus,
  CrawlerData,
  CrawlRequest,
  CrawlerDomain,
  CrawlType,
} from './types';

import {
  crawlerDomainServerToClient,
  crawlerDataServerToClient,
  crawlDomainValidationToResult,
  crawlRequestServerToClient,
  getDeleteDomainConfirmationMessage,
  getDeleteDomainSuccessMessage,
  getCrawlRulePathPatternTooltip,
} from './utils';

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

    const defaultServerPayload: CrawlerDomainFromServer = {
      id,
      name,
      created_on: 'Mon, 31 Aug 2020 17:00:00 +0000',
      document_count: 13,
      sitemaps: [],
      entry_points: [],
      crawl_rules: [],
      deduplication_enabled: false,
      deduplication_fields: ['title'],
      available_deduplication_fields: ['title', 'description'],
    };

    const defaultClientPayload: CrawlerDomain = {
      id,
      createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
      url: name,
      documentCount: 13,
      sitemaps: [],
      entryPoints: [],
      crawlRules: [],
      deduplicationEnabled: false,
      deduplicationFields: ['title'],
      availableDeduplicationFields: ['title', 'description'],
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

describe('crawlRequestServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    const id = '507f1f77bcf86cd799439011';

    const defaultServerPayload: CrawlRequestFromServer = {
      id,
      status: CrawlerStatus.Pending,
      created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      began_at: null,
      completed_at: null,
    };

    const defaultClientPayload: CrawlRequest = {
      id,
      status: CrawlerStatus.Pending,
      createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
      beganAt: null,
      completedAt: null,
    };

    expect(crawlRequestServerToClient(defaultServerPayload)).toStrictEqual(defaultClientPayload);
    expect(
      crawlRequestServerToClient({
        ...defaultServerPayload,
        began_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...defaultClientPayload, beganAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
    expect(
      crawlRequestServerToClient({
        ...defaultServerPayload,
        completed_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...defaultClientPayload, completedAt: 'Mon, 31 Aug 2020 17:00:00 +0000' });
  });
});

describe('crawlerDataServerToClient', () => {
  let output: CrawlerData;

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
      deduplication_enabled: false,
      deduplication_fields: ['title'],
      available_deduplication_fields: ['title', 'description'],
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
      deduplication_enabled: false,
      deduplication_fields: ['title'],
      available_deduplication_fields: ['title', 'description'],
    },
  ];

  beforeAll(() => {
    output = crawlerDataServerToClient({
      domains,
      events: [
        {
          id: '618d0e66abe97bc688328900',
          status: CrawlerStatus.Pending,
          stage: 'crawl',
          created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
          began_at: null,
          completed_at: null,
          type: CrawlType.Full,
          crawl_config: {
            domain_allowlist: ['https://www.elastic.co'],
          },
        },
      ],
      most_recent_crawl_request: {
        id: '618d0e66abe97bc688328900',
        status: CrawlerStatus.Pending,
        created_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
        began_at: null,
        completed_at: null,
      },
    });
  });

  it('converts all data from the server form to their client form', () => {
    expect(output.domains).toEqual([
      {
        id: 'x',
        url: 'moviedatabase.com',
        documentCount: 13,
        createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
        sitemaps: [],
        entryPoints: [],
        crawlRules: [],
        defaultCrawlRule: DEFAULT_CRAWL_RULE,
        deduplicationEnabled: false,
        deduplicationFields: ['title'],
        availableDeduplicationFields: ['title', 'description'],
      },
      {
        id: 'y',
        url: 'swiftype.com',
        lastCrawl: 'Mon, 31 Aug 2020 17:00:00 +0000',
        documentCount: 40,
        createdOn: 'Mon, 31 Aug 2020 17:00:00 +0000',
        sitemaps: [],
        entryPoints: [],
        crawlRules: [],
        deduplicationEnabled: false,
        deduplicationFields: ['title'],
        availableDeduplicationFields: ['title', 'description'],
      },
    ]);
    expect(output.events).toEqual([
      {
        id: '618d0e66abe97bc688328900',
        status: CrawlerStatus.Pending,
        stage: 'crawl',
        createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
        beganAt: null,
        completedAt: null,
        type: 'full',
        crawlConfig: {
          domainAllowlist: ['https://www.elastic.co'],
        },
      },
    ]);
    expect(output.mostRecentCrawlRequest).toEqual({
      id: '618d0e66abe97bc688328900',
      status: CrawlerStatus.Pending,
      createdAt: 'Mon, 31 Aug 2020 17:00:00 +0000',
      beganAt: null,
      completedAt: null,
    });
  });
});

describe('crawlDomainValidationToResult', () => {
  it('handles results with warnings', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      valid: true,
      results: [
        {
          name: '-',
          result: 'warning',
          comment: 'A warning, not failure',
        },
      ],
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      blockingFailure: false,
      state: 'warning',
      message: 'A warning, not failure',
    } as CrawlerDomainValidationStep);
  });

  it('handles valid results, without warnings', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      valid: true,
      results: [
        {
          name: '-',
          result: 'ok',
          comment: 'Something happened',
        },
      ],
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      state: 'valid',
    } as CrawlerDomainValidationStep);
  });

  it('handes invalid results', () => {
    const data: CrawlerDomainValidationResultFromServer = {
      valid: false,
      results: [
        {
          name: '-',
          result: 'failure',
          comment: 'Something unexpected happened',
        },
      ],
    };

    expect(crawlDomainValidationToResult(data)).toEqual({
      blockingFailure: true,
      state: 'invalid',
      message: 'Something unexpected happened',
    } as CrawlerDomainValidationStep);
  });
});

describe('getDeleteDomainConfirmationMessage', () => {
  it('includes the url', () => {
    expect(getDeleteDomainConfirmationMessage('https://elastic.co/')).toContain(
      'https://elastic.co'
    );
  });
});

describe('getDeleteDomainSuccessMessage', () => {
  it('includes the url', () => {
    expect(getDeleteDomainSuccessMessage('https://elastic.co/')).toContain('https://elastic.co');
  });
});

describe('getCrawlRulePathPatternTooltip', () => {
  it('includes regular expression', () => {
    const crawlRule: CrawlRule = {
      id: '-',
      policy: CrawlerPolicies.allow,
      rule: CrawlerRules.regex,
      pattern: '.*',
    };

    expect(getCrawlRulePathPatternTooltip(crawlRule)).toContain('regular expression');
  });

  it('includes meta', () => {
    const crawlRule: CrawlRule = {
      id: '-',
      policy: CrawlerPolicies.allow,
      rule: CrawlerRules.beginsWith,
      pattern: '/elastic',
    };

    expect(getCrawlRulePathPatternTooltip(crawlRule)).not.toContain('regular expression');
    expect(getCrawlRulePathPatternTooltip(crawlRule)).toContain('meta');
  });
});
