/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';
import { renderHook } from '@testing-library/react-hooks';
import { useLensAttributes } from './use_lens_attributes';
import type { DataView } from '@kbn/data-views-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { InfraClientStartDeps } from '../types';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { FilterStateStore } from '@kbn/es-query';

jest.mock('@kbn/kibana-react-plugin/public');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: '@timestamp',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
  fields: [],
  metaFields: [],
} as unknown as jest.Mocked<DataView>;

const lensPluginMockStart = lensPluginMock.createStartContract();
const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      lens: { ...lensPluginMockStart },
    } as Partial<CoreStart> & Partial<InfraClientStartDeps>,
  } as unknown as KibanaReactContextValue<Partial<CoreStart> & Partial<InfraClientStartDeps>>);
};

describe('useHostTable hook', () => {
  beforeEach(() => {
    mockUseKibana();
  });

  it('should return the basic lens attributes', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLensAttributes({
        type: 'cpuCores',
        dataView: mockDataView,
      })
    );
    await waitForNextUpdate();

    const { state, title } = result.current.attributes ?? {};
    const { datasourceStates, filters } = state ?? {};

    expect(title).toBe('CPU Cores Usage');
    expect(datasourceStates).toEqual({
      formBased: {
        layers: {
          layer1: {
            columnOrder: ['hosts_aggs_breakdown', 'x_date_histogram', 'y_cpu_cores_usage'],
            columns: {
              hosts_aggs_breakdown: {
                dataType: 'string',
                isBucketed: true,
                label: 'Top 10 values of host.name',
                operationType: 'terms',
                params: {
                  exclude: [],
                  excludeIsRegex: false,
                  include: [],
                  includeIsRegex: false,
                  missingBucket: false,
                  orderBy: {
                    fallback: false,
                    type: 'alphabetical',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 10,
                },
                scale: 'ordinal',
                sourceField: 'host.name',
              },
              x_date_histogram: {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
              },
              y_cpu_cores_usage: {
                customLabel: false,
                dataType: 'number',
                filter: undefined,
                isBucketed: false,
                label: 'average(system.load.1) / max(system.load.cores)',
                operationType: 'formula',
                params: {
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 0,
                    },
                  },
                  formula: 'average(system.load.1) / max(system.load.cores)',
                  isFormulaBroken: true,
                },
                reducedTimeRange: undefined,
                references: [],
                timeScale: undefined,
              },
            },
            indexPatternId: 'mock-id',
          },
          referenceLayer: {
            columnOrder: ['referenceColumn'],
            columns: {
              referenceColumn: {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                isStaticValue: true,
                label: 'Reference',
                operationType: 'static_value',
                params: {
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 2,
                    },
                  },
                  value: 1,
                },
                references: [],
                scale: 'ratio',
              },
            },
            incompleteColumns: {},
            linkToLayers: [],
            sampling: 1,
          },
        },
      },
    });
    expect(filters).toEqual([
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          index: 'c1ec8212-ecee-494a-80da-f6f33b3393f2',
          key: 'system.load.cores',
          negate: false,
          type: 'exists',
          value: 'exists',
        },
        query: { exists: { field: 'system.load.cores' } },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          index: 'c1ec8212-ecee-494a-80da-f6f33b3393f2',
          key: 'system.load.1',
          negate: false,
          type: 'exists',
          value: 'exists',
        },
        query: { exists: { field: 'system.load.1' } },
      },
    ]);
  });

  it('should return attributes with injected values', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLensAttributes({
        type: 'cpuCores',
        dataView: mockDataView,
      })
    );
    await waitForNextUpdate();

    const injectedData = {
      query: {
        language: 'kuery',
        query: '{term: { host.name: "a"}}',
      },
      filters: [
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            alias: null,
            disabled: false,
            index: 'c1ec8212-ecee-494a-80da-f6f33b3393f2',
            key: 'system.load.cores',
            negate: false,
            type: 'range',
            value: 'range',
          },
          query: { range: { 'system.load.cores': { gte: 0 } } },
        },
      ],
      title: 'Injected CPU Cores',
    };

    const injectedAttributes = result.current.injectData(injectedData);

    const { state, title } = injectedAttributes ?? {};
    const { filters, query } = state ?? {};

    expect(title).toEqual(injectedData.title);
    expect(query).toEqual(injectedData.query);
    expect(filters).toHaveLength(3);
    expect(filters).toContain(injectedData.filters[0]);
  });
});
