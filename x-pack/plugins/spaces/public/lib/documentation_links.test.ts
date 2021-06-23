/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinksServiceMock } from 'src/core/public/mocks';

import { DocumentationLinksService } from './documentation_links';

describe('DocumentationLinksService', () => {
  const setup = () => {
    const docLinks = docLinksServiceMock.createStartContract();
    const service = new DocumentationLinksService(docLinks);
    return { docLinks, service };
  };

  describe('#getKibanaPrivilegesDocUrl', () => {
    it('returns expected value', () => {
      const { service } = setup();
      expect(service.getKibanaPrivilegesDocUrl()).toMatchInlineSnapshot(
        `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/kibana-privileges.html"`
      );
    });
  });
});
