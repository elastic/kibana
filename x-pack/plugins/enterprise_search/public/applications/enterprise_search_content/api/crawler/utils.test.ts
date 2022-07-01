/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrawlerDomainFromServer, CrawlerDomain } from './types';

import { crawlerDomainServerToClient } from './utils';

describe('crawlerDomainServerToClient', () => {
  it('converts the API payload into properties matching our code style', () => {
    const id = '507f1f77bcf86cd799439011';
    const name = 'moviedatabase.com';

    const defaultServerPayload: CrawlerDomainFromServer = {
      document_count: 13,
      id,
      name,
    };

    const defaultClientPayload: CrawlerDomain = {
      documentCount: 13,
      id,
      url: name,
    };

    expect(crawlerDomainServerToClient(defaultServerPayload)).toStrictEqual(defaultClientPayload);
    expect(
      crawlerDomainServerToClient({
        ...defaultServerPayload,
        last_visited_at: 'Mon, 31 Aug 2020 17:00:00 +0000',
      })
    ).toStrictEqual({ ...defaultClientPayload, lastCrawl: 'Mon, 31 Aug 2020 17:00:00 +0000' });
  });
});
