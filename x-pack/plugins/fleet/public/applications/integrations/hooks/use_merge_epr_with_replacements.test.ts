/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';

import type { PackageListItem } from '../../../../common/types/models';

import { useMergeEprPackagesWithReplacements } from './use_merge_epr_with_replacements';

function mockEprPackages(
  items: Array<{ name: string; release: 'ga' | 'beta' | 'experimental'; integration?: string }>
): PackageListItem[] {
  return items as unknown as PackageListItem[];
}

function mockIntegrations(
  items: Array<{ eprOverlap?: string; id: string; categories: IntegrationCategory[] }>
): CustomIntegration[] {
  return items as unknown as CustomIntegration[];
}

describe('useMergeEprWithReplacements', () => {
  test('should not replace ga packages', () => {
    const eprPackages: PackageListItem[] = mockEprPackages([
      {
        name: 'aws',
        release: 'ga',
        integration: 'cloudwatch',
      },
      {
        name: 'aws',
        release: 'ga',
        integration: 's3',
      },
    ]);
    const replacements: CustomIntegration[] = mockIntegrations([
      {
        eprOverlap: 'aws',
        id: 'awsLogs',
        categories: ['cloud', 'datastore'],
      },
    ]);

    expect(useMergeEprPackagesWithReplacements(eprPackages, replacements)).toEqual([
      {
        name: 'aws',
        release: 'ga',
        integration: 'cloudwatch',
      },
      {
        name: 'aws',
        release: 'ga',
        integration: 's3',
      },
    ]);
  });

  test('should replace non-ga packages', () => {
    const eprPackages: PackageListItem[] = mockEprPackages([
      {
        name: 'activemq',
        release: 'beta',
      },
    ]);
    const replacements: CustomIntegration[] = mockIntegrations([
      {
        eprOverlap: 'activemq',
        id: 'activemq-logs',
        categories: ['web'],
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-metrics',
        categories: ['web'],
      },
    ]);

    expect(useMergeEprPackagesWithReplacements(eprPackages, replacements)).toEqual([
      {
        eprOverlap: 'activemq',
        id: 'activemq-logs',
        categories: ['web'],
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-metrics',
        categories: ['web'],
      },
    ]);
  });

  test('should merge if no equivalent package', () => {
    const eprPackages: PackageListItem[] = mockEprPackages([
      {
        name: 'activemq',
        release: 'beta',
      },
    ]);
    const replacements: CustomIntegration[] = mockIntegrations([
      {
        id: 'prometheus',
        categories: ['monitoring', 'datastore'],
      },
    ]);

    expect(useMergeEprPackagesWithReplacements(eprPackages, replacements)).toEqual([
      {
        name: 'activemq',
        release: 'beta',
      },
      {
        id: 'prometheus',
        categories: ['monitoring', 'datastore'],
      },
    ]);
  });

  test('should filter out apm from package list', () => {
    const eprPackages: PackageListItem[] = mockEprPackages([
      {
        name: 'apm',
        release: 'beta',
      },
    ]);

    expect(useMergeEprPackagesWithReplacements(eprPackages, [])).toEqual([]);
  });

  test('should consists of all 3 types (ga eprs, replacements for non-ga eprs, replacements without epr equivalent', () => {
    const eprPackages: PackageListItem[] = mockEprPackages([
      {
        name: 'aws',
        release: 'ga',
        integration: 'cloudwatch',
      },
      {
        name: 'aws',
        release: 'ga',
        integration: 's3',
      },
      {
        name: 'activemq',
        release: 'beta',
      },
      {
        name: 'apm',
        release: 'ga',
      },
    ]);
    const replacements: CustomIntegration[] = mockIntegrations([
      {
        id: 'prometheus',
        categories: ['monitoring', 'datastore'],
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-logs',
        categories: ['web'],
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-metrics',
        categories: ['web'],
      },
      {
        eprOverlap: 'aws',
        id: 'awsLogs',
        categories: ['cloud', 'datastore'],
      },
      {
        eprOverlap: 'aws',
        id: 'awsMetrics',
        categories: ['cloud', 'datastore'],
      },
    ]);

    expect(useMergeEprPackagesWithReplacements(eprPackages, replacements)).toEqual([
      {
        name: 'aws',
        release: 'ga',
        integration: 'cloudwatch',
      },
      {
        name: 'aws',
        release: 'ga',
        integration: 's3',
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-logs',
        categories: ['web'],
      },
      {
        eprOverlap: 'activemq',
        id: 'activemq-metrics',
        categories: ['web'],
      },
      {
        id: 'prometheus',
        categories: ['monitoring', 'datastore'],
      },
    ]);
  });
});
