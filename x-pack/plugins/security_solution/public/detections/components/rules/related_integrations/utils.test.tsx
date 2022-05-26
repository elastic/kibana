/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstalledRelatedIntegrations, getIntegrationLink } from './utils';

describe('Related Integrations Utilities', () => {
  describe('#getIntegrationLink', () => {
    test('it returns a correctly formatted integrations link', () => {
      const link = getIntegrationLink(
        { package: 'test', integration: 'int', version: '1.23.4' },
        ''
      );

      expect(link).toBeFalsy();
    });
  });

  describe('#getInstalledRelatedIntegrations', () => {
    test('it returns a the correct integrationDetails', () => {
      const integrationDetails = getInstalledRelatedIntegrations([], []);

      expect(integrationDetails.length).to.eql(0);
    });
  });
});
