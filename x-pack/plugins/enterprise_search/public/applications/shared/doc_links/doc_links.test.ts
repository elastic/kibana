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
      ELASTIC_WEBSITE_URL: 'https://elastic.co',
      links: {
        enterpriseSearch: {
          base: 'http://elastic.enterprise.search',
          appSearchBase: 'http://elastic.app.search',
          workplaceSearchBase: 'http://elastic.workplace.search',
        },
      },
    };

    docLinksService.setDocLinks(docLinks as any);

    expect(docLinksService.enterpriseSearchBase).toEqual(docLinks.links.enterpriseSearch.base);
    expect(docLinksService.appSearchBase).toEqual(docLinks.links.enterpriseSearch.appSearchBase);
    expect(docLinksService.workplaceSearchBase).toEqual(
      docLinks.links.enterpriseSearch.workplaceSearchBase
    );
    expect(docLinksService.cloudBase).toEqual(
      `${docLinks.ELASTIC_WEBSITE_URL}guide/en/cloud/current`
    );
  });
});
