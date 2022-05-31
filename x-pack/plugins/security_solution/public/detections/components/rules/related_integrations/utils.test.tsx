/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { getInstalledRelatedIntegrations, getIntegrationLink } from './utils';

describe('Related Integrations Utilities', () => {
  describe('#getIntegrationLink', () => {
    test('it returns a correctly formatted integrations link', () => {
      const link = getIntegrationLink(
        { package: 'test', integration: 'int', version: '1.23.4' },
        'http://localhost'
      );
      const { container } = render(link);

      expect(container.firstChild).toHaveProperty(
        'href',
        'http://localhost/app/integrations/detail/test-1.23.4/overview?integration=int'
      );
    });
  });

  describe('#getInstalledRelatedIntegrations', () => {
    test('it returns a the correct integrationDetails', () => {
      const integrationDetails = getInstalledRelatedIntegrations([], []);

      expect(integrationDetails.length).toEqual(0);
    });
  });
});
