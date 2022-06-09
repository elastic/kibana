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

    describe('version is correctly computed', () => {
      test('Unknown integration that does not exist', () => {
        const integrationDetails = getInstalledRelatedIntegrations(
          [
            {
              package: 'foo1',
              version: '~1.2.3',
            },
            {
              package: 'foo2',
              version: '^1.2.3',
            },
            {
              package: 'foo3',
              version: '1.2.x',
            },
          ],
          []
        );

        expect(integrationDetails[0].target_version).toEqual('1.2.3');
        expect(integrationDetails[1].target_version).toEqual('1.2.3');
        expect(integrationDetails[2].target_version).toEqual('1.2.0');
      });

      test('Integration that is not installed', () => {
        const integrationDetails = getInstalledRelatedIntegrations(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '~1.2.3',
            },
            {
              package: 'system',
              version: '^1.2.3',
            },
          ],
          []
        );

        expect(integrationDetails[0].target_version).toEqual('1.2.3');
        expect(integrationDetails[1].target_version).toEqual('1.2.3');
      });

      test('Integration that is installed, and its version matches required version', () => {
        const integrationDetails = getInstalledRelatedIntegrations(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '^1.2.3',
            },
            {
              package: 'system',
              version: '~1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              package_version: '1.3.0',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              package_version: '1.2.5',
              is_enabled: true,
            },
          ]
        );

        // Since version is satisfied, we check `package_version`
        expect(integrationDetails[0].version_satisfied).toEqual(true);
        expect(integrationDetails[0].package_version).toEqual('1.3.0');
        expect(integrationDetails[1].version_satisfied).toEqual(true);
        expect(integrationDetails[1].package_version).toEqual('1.2.5');
      });

      test('Integration that is installed, and its version is less than required version', () => {
        const integrationDetails = getInstalledRelatedIntegrations(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '~1.2.3',
            },
            {
              package: 'system',
              version: '^1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              package_version: '1.2.0',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              package_version: '1.2.2',
              is_enabled: true,
            },
          ]
        );

        expect(integrationDetails[0].target_version).toEqual('1.2.3');
        expect(integrationDetails[1].target_version).toEqual('1.2.3');
      });

      test('Integration that is installed, and its version is greater than required version', () => {
        const integrationDetails = getInstalledRelatedIntegrations(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '^1.2.3',
            },
            {
              package: 'system',
              version: '~1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              package_version: '2.0.1',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              package_version: '1.3.0',
              is_enabled: true,
            },
          ]
        );

        expect(integrationDetails[0].target_version).toEqual('1.2.3');
        expect(integrationDetails[1].target_version).toEqual('1.2.3');
      });
    });
  });
});
