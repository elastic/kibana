/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, InstallationStatus } from '../types';
import { packageToConfigDatasourceInputs } from './package_to_config';

describe('Ingest Manager - packageToConfigDatasourceInputs', () => {
  const mockPackage: PackageInfo = {
    name: 'mock-package',
    title: 'Mock package',
    version: '0.0.0',
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
      },
    },
    status: InstallationStatus.notInstalled,
  };

  it('returns empty array for packages with no datasources', () => {
    expect(packageToConfigDatasourceInputs(mockPackage)).toEqual([]);
    expect(packageToConfigDatasourceInputs({ ...mockPackage, datasources: [] })).toEqual([]);
  });

  it('returns empty array for packages a datasource but no inputs', () => {
    expect(
      packageToConfigDatasourceInputs({ ...mockPackage, datasources: [{ inputs: [] }] })
    ).toEqual([]);
  });

  it('returns inputs with no streams for packages with no streams', () => {
    expect(
      packageToConfigDatasourceInputs({
        ...mockPackage,
        datasources: [{ inputs: [{ type: 'foo' }] }],
      })
    ).toEqual([{ type: 'foo', enabled: true, streams: [] }]);
    expect(
      packageToConfigDatasourceInputs({
        ...mockPackage,
        datasources: [{ inputs: [{ type: 'foo' }, { type: 'bar' }] }],
      })
    ).toEqual([
      { type: 'foo', enabled: true, streams: [] },
      { type: 'bar', enabled: true, streams: [] },
    ]);
  });

  it('returns inputs with streams for packages with streams', () => {
    expect(
      packageToConfigDatasourceInputs({
        ...mockPackage,
        datasources: [
          {
            inputs: [
              { type: 'foo', streams: [{ dataset: 'foo' }] },
              { type: 'bar', streams: [{ dataset: 'bar' }, { dataset: 'bar2' }] },
            ],
          },
        ],
      })
    ).toEqual([
      {
        type: 'foo',
        enabled: true,
        streams: [{ id: 'foo-foo', enabled: true, dataset: 'foo', config: {} }],
      },
      {
        type: 'bar',
        enabled: true,
        streams: [
          { id: 'bar-bar', enabled: true, dataset: 'bar', config: {} },
          { id: 'bar-bar2', enabled: true, dataset: 'bar2', config: {} },
        ],
      },
    ]);
  });

  it('returns inputs with streams configurations for packages with stream vars', () => {
    expect(
      packageToConfigDatasourceInputs({
        ...mockPackage,
        datasources: [
          {
            inputs: [
              {
                type: 'foo',
                streams: [
                  { dataset: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] },
                ],
              },
              {
                type: 'bar',
                streams: [
                  { dataset: 'bar', vars: [{ default: 'bar-var-value', name: 'var-name' }] },
                  { dataset: 'bar2', vars: [{ default: 'bar2-var-value', name: 'var-name' }] },
                ],
              },
            ],
          },
        ],
      })
    ).toEqual([
      {
        type: 'foo',
        enabled: true,
        streams: [
          { id: 'foo-foo', enabled: true, dataset: 'foo', config: { 'var-name': 'foo-var-value' } },
        ],
      },
      {
        type: 'bar',
        enabled: true,
        streams: [
          { id: 'bar-bar', enabled: true, dataset: 'bar', config: { 'var-name': 'bar-var-value' } },
          {
            id: 'bar-bar2',
            enabled: true,
            dataset: 'bar2',
            config: { 'var-name': 'bar2-var-value' },
          },
        ],
      },
    ]);
  });

  it('returns inputs with streams configurations for packages with stream and input vars', () => {
    expect(
      packageToConfigDatasourceInputs({
        ...mockPackage,
        datasources: [
          {
            inputs: [
              {
                type: 'foo',
                vars: [
                  { default: 'foo-input-var-value', name: 'foo-input-var-name' },
                  { default: 'foo-input2-var-value', name: 'foo-input2-var-name' },
                  { name: 'foo-input3-var-name' },
                ],
                streams: [
                  { dataset: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] },
                ],
              },
              {
                type: 'bar',
                vars: [
                  { default: ['value1', 'value2'], name: 'bar-input-var-name' },
                  { default: 123456, name: 'bar-input2-var-name' },
                ],
                streams: [
                  { dataset: 'bar', vars: [{ default: 'bar-var-value', name: 'var-name' }] },
                  { dataset: 'bar2', vars: [{ default: 'bar2-var-value', name: 'var-name' }] },
                ],
              },
            ],
          },
        ],
      })
    ).toEqual([
      {
        type: 'foo',
        enabled: true,
        streams: [
          {
            id: 'foo-foo',
            enabled: true,
            dataset: 'foo',
            config: {
              'var-name': 'foo-var-value',
              'foo-input-var-name': 'foo-input-var-value',
              'foo-input2-var-name': 'foo-input2-var-value',
              'foo-input3-var-name': undefined,
            },
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
            dataset: 'bar',
            config: {
              'var-name': 'bar-var-value',
              'bar-input-var-name': ['value1', 'value2'],
              'bar-input2-var-name': 123456,
            },
          },
          {
            id: 'bar-bar2',
            enabled: true,
            dataset: 'bar2',
            config: {
              'var-name': 'bar2-var-value',
              'bar-input-var-name': ['value1', 'value2'],
              'bar-input2-var-name': 123456,
            },
          },
        ],
      },
    ]);
  });
});
