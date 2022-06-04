/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  integrationDetailsEnabled,
  integrationDetailsInstalled,
  integrationDetailsUninstalled,
} from './mock';
import { render } from '@testing-library/react';
import { getInstalledRelatedIntegrations, getIntegrationLink } from './utils';

describe('Related Integrations Utilities', () => {
  describe('#getIntegrationLink', () => {
    describe('it returns a correctly formatted integrations link', () => {
      test('given an uninstalled integrationDetails', () => {
        const link = getIntegrationLink(integrationDetailsUninstalled, 'http://localhost');
        const { container } = render(link);

        expect(container.firstChild).toHaveProperty(
          'href',
          'http://localhost/app/integrations/detail/test-1.2.3/overview?integration=integration'
        );
      });

      test('given an installed integrationDetails', () => {
        const link = getIntegrationLink(integrationDetailsInstalled, 'http://localhost');
        const { container } = render(link);

        expect(container.firstChild).toHaveProperty(
          'href',
          'http://localhost/app/integrations/detail/test-1.2.3/overview?integration=integration'
        );
      });

      test('given an enabled integrationDetails with an unsatisfied version', () => {
        const link = getIntegrationLink(integrationDetailsEnabled, 'http://localhost');
        const { container } = render(link);

        expect(container.firstChild).toHaveProperty(
          'href',
          'http://localhost/app/integrations/detail/test-1.3.3/overview?integration=integration'
        );
      });
    });
  });

  describe('#getInstalledRelatedIntegrations', () => {
    test('it returns a the correct integrationDetails', () => {
      const integrationDetails = getInstalledRelatedIntegrations([], []);

      expect(integrationDetails.length).toEqual(0);
    });
  });
});
