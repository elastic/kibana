/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, InstallationStatus } from '../types';
import { packageToConfigDatasource, packageToConfigDatasourceInputs } from './package_to_config';

describe('Ingest Manager - packageToConfig', () => {
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

  describe('packageToConfigDatasourceInputs', () => {
    it('returns empty array for packages with no datasources', () => {
      expect(packageToConfigDatasourceInputs(mockPackage)).toEqual([]);
      expect(packageToConfigDatasourceInputs({ ...mockPackage, config_templates: [] })).toEqual([]);
    });

    it('returns empty array for packages a datasource but no inputs', () => {
      expect(
        packageToConfigDatasourceInputs(({
          ...mockPackage,
          config_templates: [{ inputs: [] }],
        } as unknown) as PackageInfo)
      ).toEqual([]);
    });

    it('returns inputs with no streams for packages with no streams', () => {
      expect(
        packageToConfigDatasourceInputs(({
          ...mockPackage,
          config_templates: [{ inputs: [{ type: 'foo' }] }],
        } as unknown) as PackageInfo)
      ).toEqual([{ type: 'foo', enabled: true, streams: [] }]);
      expect(
        packageToConfigDatasourceInputs(({
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
        packageToConfigDatasourceInputs(({
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
          streams: [{ id: 'foo-foo', enabled: true, dataset: { name: 'foo', type: 'logs' } }],
        },
        {
          type: 'bar',
          enabled: true,
          streams: [
            { id: 'bar-bar', enabled: true, dataset: { name: 'bar', type: 'logs' } },
            { id: 'bar-bar2', enabled: true, dataset: { name: 'bar2', type: 'logs' } },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream vars', () => {
      expect(
        packageToConfigDatasourceInputs(({
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
              dataset: { name: 'foo', type: 'logs' },
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
              dataset: { name: 'bar', type: 'logs' },
              vars: { 'var-name': { type: 'text', value: 'bar-var-value' } },
            },
            {
              id: 'bar-bar2',
              enabled: true,
              dataset: { name: 'bar2', type: 'logs' },
              vars: { 'var-name': { type: 'yaml', value: 'bar2-var-value' } },
            },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream and input vars', () => {
      expect(
        packageToConfigDatasourceInputs(({
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
              dataset: { name: 'foo', type: 'logs' },
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
              dataset: { name: 'bar', type: 'logs' },
              vars: {
                'var-name': { value: 'bar-var-value' },
              },
            },
            {
              id: 'bar-bar2',
              enabled: true,
              dataset: { name: 'bar2', type: 'logs' },
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
              dataset: { name: 'disabled', type: 'logs' },
              vars: {
                'var-name': { value: [] },
              },
            },
            {
              id: 'with-disabled-streams-disabled2',
              enabled: false,
              dataset: { name: 'disabled2', type: 'logs' },
            },
          ],
        },
      ]);
    });
  });

  describe('packageToConfigDatasource', () => {
    it('returns datasource with default name', () => {
      expect(packageToConfigDatasource(mockPackage, '1', '2')).toEqual({
        config_id: '1',
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
    it('returns datasource with custom name', () => {
      expect(packageToConfigDatasource(mockPackage, '1', '2', 'ds-1')).toEqual({
        config_id: '1',
        enabled: true,
        inputs: [],
        name: 'ds-1',
        output_id: '2',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });
    it('returns datasource with namespace and description', () => {
      expect(
        packageToConfigDatasource(
          mockPackage,
          '1',
          '2',
          'ds-1',
          'mock-namespace',
          'Test description'
        )
      ).toEqual({
        config_id: '1',
        enabled: true,
        inputs: [],
        name: 'ds-1',
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
    it('returns datasource with inputs', () => {
      const mockPackageWithDatasources = ({
        ...mockPackage,
        config_templates: [{ inputs: [{ type: 'foo' }] }],
      } as unknown) as PackageInfo;

      expect(packageToConfigDatasource(mockPackageWithDatasources, '1', '2', 'ds-1')).toEqual({
        config_id: '1',
        enabled: true,
        inputs: [{ type: 'foo', enabled: true, streams: [] }],
        name: 'ds-1',
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
