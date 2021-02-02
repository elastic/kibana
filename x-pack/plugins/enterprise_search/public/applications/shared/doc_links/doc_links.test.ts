/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { docLinks } from './';

describe('DocLinks', () => {
  it('setDocLinks', () => {
    const links = {
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

    docLinks.setDocLinks(links as any);

    expect(docLinks.enterpriseSearchBase).toEqual('http://elastic.enterprise.search');
    expect(docLinks.appSearchBase).toEqual('http://elastic.app.search');
    expect(docLinks.workplaceSearchBase).toEqual('http://elastic.workplace.search');
    expect(docLinks.cloudBase).toEqual('https://elastic.co/guide/en/cloud/current');
  });
});
