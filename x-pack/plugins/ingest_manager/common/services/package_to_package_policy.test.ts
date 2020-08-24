/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, InstallationStatus } from '../types';
import { packageToPackagePolicy, packageToPackagePolicyInputs } from './package_to_package_policy';

describe('Ingest Manager - packageToPackagePolicy', () => {
  const mockPackage: PackageInfo = {
    name: 'mock-package',
    title: 'Mock package',
    version: '0.0.0',
    latestVersion: '0.0.0',
    description: 'description',
    type: 'mock',
    categories: [],
    requirement: { kibana: { versions: '' }, elasticsearch: { versions: '' } },
    format_version: '',
    download: '',
    path: '',
    assets: {
      kibana: {
        dashboard: [],
        visualization: [],
        search: [],
        'index-pattern': [],
        map: [],
      },
    },
    status: InstallationStatus.notInstalled,
  };

  describe('packageToPackagePolicyInputs', () => {
    it('returns empty array for packages with no config templates', () => {
      expect(packageToPackagePolicyInputs(mockPackage)).toEqual([]);
      expect(packageToPackagePolicyInputs({ ...mockPackage, config_templates: [] })).toEqual([]);
    });

    it('returns empty array for packages with a config template but no inputs', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          config_templates: [{ inputs: [] }],
        } as unknown) as PackageInfo)
      ).toEqual([]);
    });

    it('returns inputs with no streams for packages with no streams', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          config_templates: [{ inputs: [{ type: 'foo' }] }],
        } as unknown) as PackageInfo)
      ).toEqual([{ type: 'foo', enabled: true, streams: [] }]);
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          config_templates: [{ inputs: [{ type: 'foo' }, { type: 'bar' }] }],
        } as unknown) as PackageInfo)
      ).toEqual([
        { type: 'foo', enabled: true, streams: [] },
        { type: 'bar', enabled: true, streams: [] },
      ]);
    });

    it('returns inputs with streams for packages with streams', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          datasets: [
            { type: 'logs', name: 'foo', streams: [{ input: 'foo' }] },
            { type: 'logs', name: 'bar', streams: [{ input: 'bar' }] },
            { type: 'logs', name: 'bar2', streams: [{ input: 'bar' }] },
          ],
          config_templates: [
            {
              inputs: [{ type: 'foo' }, { type: 'bar' }],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          streams: [
            { id: 'foo-foo', enabled: true, data_stream: { dataset: 'foo', type: 'logs' } },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          streams: [
            { id: 'bar-bar', enabled: true, data_stream: { dataset: 'bar', type: 'logs' } },
            { id: 'bar-bar2', enabled: true, data_stream: { dataset: 'bar2', type: 'logs' } },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream vars', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          datasets: [
            {
              type: 'logs',
              name: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              name: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name', type: 'text' }],
                },
              ],
            },
            {
              type: 'logs',
              name: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'yaml' }],
                },
              ],
            },
          ],
          config_templates: [
            {
              inputs: [{ type: 'foo' }, { type: 'bar' }],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          streams: [
            {
              id: 'foo-foo',
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: { 'var-name': { value: 'foo-var-value' } },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          streams: [
            {
              id: 'bar-bar',
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: { 'var-name': { type: 'text', value: 'bar-var-value' } },
            },
            {
              id: 'bar-bar2',
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: { 'var-name': { type: 'yaml', value: 'bar2-var-value' } },
            },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream and input vars', () => {
      expect(
        packageToPackagePolicyInputs(({
          ...mockPackage,
          datasets: [
            {
              type: 'logs',
              name: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              name: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              name: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              name: 'disabled',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                  vars: [{ multi: true, name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              name: 'disabled2',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                },
              ],
            },
          ],
          config_templates: [
            {
              inputs: [
                {
                  type: 'foo',
                  vars: [
                    { default: 'foo-input-var-value', name: 'foo-input-var-name' },
                    { default: 'foo-input2-var-value', name: 'foo-input2-var-name' },
                    { name: 'foo-input3-var-name' },
                  ],
                },
                {
                  type: 'bar',
                  vars: [
                    { default: ['value1', 'value2'], name: 'bar-input-var-name' },
                    { default: 123456, name: 'bar-input2-var-name' },
                  ],
                },
                {
                  type: 'with-disabled-streams',
                },
              ],
            },
          ],
        } as unknown) as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: 'foo-input-var-value' },
            'foo-input2-var-name': { value: 'foo-input2-var-value' },
            'foo-input3-var-name': { value: undefined },
          },
          streams: [
            {
              id: 'foo-foo',
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: {
                'var-name': { value: 'foo-var-value' },
              },
            },
          ],
        },
        {
          type: 'bar',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: ['value1', 'value2'] },
            'bar-input2-var-name': { value: 123456 },
          },
          streams: [
            {
              id: 'bar-bar',
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: {
                'var-name': { value: 'bar-var-value' },
              },
            },
            {
              id: 'bar-bar2',
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: {
                'var-name': { value: 'bar2-var-value' },
              },
            },
          ],
        },
        {
          type: 'with-disabled-streams',
          enabled: false,
          streams: [
            {
              id: 'with-disabled-streams-disabled',
              enabled: false,
              data_stream: { dataset: 'disabled', type: 'logs' },
              vars: {
                'var-name': { value: [] },
              },
            },
            {
              id: 'with-disabled-streams-disabled2',
              enabled: false,
              data_stream: { dataset: 'disabled2', type: 'logs' },
            },
          ],
        },
      ]);
    });
  });

  describe('packageToPackagePolicy', () => {
    it('returns package policy with default name', () => {
      expect(packageToPackagePolicy(mockPackage, '1', '2')).toEqual({
        policy_id: '1',
        namespace: '',
        enabled: true,
        inputs: [],
        name: 'mock-package-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });
    it('returns package policy with custom name', () => {
      expect(packageToPackagePolicy(mockPackage, '1', '2', 'default', 'pkgPolicy-1')).toEqual({
        policy_id: '1',
        namespace: 'default',
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });
    it('returns package policy with namespace and description', () => {
      expect(
        packageToPackagePolicy(
          mockPackage,
          '1',
          '2',
          'mock-namespace',
          'pkgPolicy-1',
          'Test description'
        )
      ).toEqual({
        policy_id: '1',
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        namespace: 'mock-namespace',
        description: 'Test description',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });
    it('returns package policy with inputs', () => {
      const mockPackageWithConfigTemplates = ({
        ...mockPackage,
        config_templates: [{ inputs: [{ type: 'foo' }] }],
      } as unknown) as PackageInfo;

      expect(
        packageToPackagePolicy(mockPackageWithConfigTemplates, '1', '2', 'default', 'pkgPolicy-1')
      ).toEqual({
        policy_id: '1',
        namespace: 'default',
        enabled: true,
        inputs: [{ type: 'foo', enabled: true, streams: [] }],
        name: 'pkgPolicy-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });
  });
});
