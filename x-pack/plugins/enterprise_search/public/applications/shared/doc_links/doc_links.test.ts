/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { docLinksService } from './doc_links';

describe('DocLinksService#setDocLinks()', () => {
  it('adds links from docLinks', () => {
    const docLinks = {
      DOC_LINK_VERSION: '',
      ELASTIC_WEBSITE_URL: 'https://elastic.co/',
      links: {
        enterpriseSearch: {
          base: 'http://elastic.enterprise.search',
          appSearchBase: 'http://elastic.app.search',
          workplaceSearchBase: 'http://elastic.workplace.search',
        },
      },
    };

    docLinksService.setDocLinks(docLinks as any);

    expect(docLinksService.enterpriseSearchBase).toEqual('http://elastic.enterprise.search');
    expect(docLinksService.appSearchBase).toEqual('http://elastic.app.search');
    expect(docLinksService.workplaceSearchBase).toEqual('http://elastic.workplace.search');
    expect(docLinksService.cloudBase).toEqual('https://elastic.co/guide/en/cloud/current');
  });
});
