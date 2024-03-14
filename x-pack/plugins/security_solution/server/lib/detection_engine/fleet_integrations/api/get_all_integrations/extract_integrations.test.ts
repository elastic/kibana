/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageList, PackagePolicy } from '@kbn/fleet-plugin/common';
import { extractIntegrations } from './extract_integrations';

describe('extractIntegrations', () => {
  it('extracts not installed packages', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        is_installed: false,
        is_enabled: false,
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        is_installed: false,
        is_enabled: false,
      }),
    ]);
  });

  it('extracts package title', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        package_title: 'Package A',
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        package_title: 'Package A',
      }),
    ]);
  });

  it('extracts package title for a single integration package', () => {
    const packages = [
      {
        name: 'integration-a',
        title: 'Integration A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'integration-a',
        package_title: 'Integration A',
      }),
    ]);
  });

  it('integration_name and integration_title are omitted from single integration packages with matching package and integration names', () => {
    const packages = [
      {
        name: 'integration-a',
        title: 'Integration A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.not.objectContaining({
        integration_name: expect.anything(),
        integration_title: expect.anything(),
      }),
    ]);
  });

  it('extracts integration title as a concatenation of package and capitalized integration titles', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        integration_title: 'Package A Integration a',
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        integration_title: 'Package A Integration b',
      }),
    ]);
  });

  it('extracts latest available version', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        latest_package_version: '1.1.1',
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        latest_package_version: '1.1.1',
      }),
    ]);
  });

  it('extracts installed integrations', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        status: 'installed',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
        savedObject: {
          attributes: {
            install_version: '1.0.0',
          },
        },
      },
    ] as PackageList;

    const result = extractIntegrations(packages, []);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        installed_package_version: '1.0.0',
        is_installed: true,
        is_enabled: false,
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        installed_package_version: '1.0.0',
        is_installed: true,
        is_enabled: false,
      }),
    ]);
  });

  it('extracts enabled integrations', () => {
    const packages = [
      {
        name: 'package-a',
        title: 'Package A',
        version: '1.1.1',
        status: 'installed',
        policy_templates: [
          {
            name: 'integration-a',
            title: 'Integration A',
          },
          {
            name: 'integration-b',
            title: 'Integration B',
          },
        ],
        savedObject: {
          attributes: {
            install_version: '1.0.0',
          },
        },
      },
    ] as PackageList;
    const policies = [
      {
        inputs: [
          {
            enabled: true,
            policy_template: 'integration-a',
          },
          {
            enabled: true,
            type: 'integration-b',
          },
        ],
        package: {
          name: 'package-a',
        },
      },
    ] as PackagePolicy[];

    const result = extractIntegrations(packages, policies);

    expect(result).toEqual([
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-a',
        is_installed: true,
        is_enabled: true,
      }),
      expect.objectContaining({
        package_name: 'package-a',
        integration_name: 'integration-b',
        is_installed: true,
        is_enabled: true,
      }),
    ]);
  });
});
