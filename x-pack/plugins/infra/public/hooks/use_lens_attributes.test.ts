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
import { type KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { InfraClientStartDeps } from '../types';
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

const normalizedLoad1m = {
  label: 'Normalized Load',
  value: 'average(system.load.1) / max(system.load.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};

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
        visualizationType: 'lnsXY',
        layers: [
          {
            data: [normalizedLoad1m],
            options: {
              buckets: {
                type: 'date_histogram',
              },
              breakdown: {
                field: 'host.name',
                type: 'top_values',
                params: {
                  size: 10,
                },
              },
            },
            layerType: 'data',
          },
          {
            data: [
              {
                value: '1',
                format: {
                  id: 'percent',
                  params: {
                    decimals: 0,
                  },
                },
              },
            ],
            layerType: 'referenceLine',
          },
        ],
        title: 'Injected Normalized Load',
        dataView: mockDataView,
      })
    );
    await waitForNextUpdate();

    const { state, title } = result.current.attributes ?? {};
    const { datasourceStates } = state ?? {};

    expect(title).toBe('Injected Normalized Load');
    expect(datasourceStates).toEqual({
      formBased: {
        layers: {
          layer_0: {
            columnOrder: ['aggs_breakdown', 'x_date_histogram', 'formula_accessor_0_0'],
            columns: {
              aggs_breakdown: {
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
                  orderDirection: 'asc',
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
              formula_accessor_0_0: {
                customLabel: true,
                dataType: 'number',
                filter: undefined,
                isBucketed: false,
                label: 'Normalized Load',
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
          layer_1_reference: {
            columnOrder: ['formula_accessor_1_0_reference_column'],
            columns: {
              formula_accessor_1_0_reference_column: {
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
                      decimals: 0,
                    },
                  },
                  value: '1',
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
  });

  it('should return extra actions', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLensAttributes({
        title: 'Chart',
        visualizationType: 'lnsXY',
        layers: [
          {
            data: [normalizedLoad1m],
            layerType: 'data',
          },
        ],
        dataView: mockDataView,
      })
    );
    await waitForNextUpdate();

    const extraActions = result.current.getExtraActions({
      timeRange: {
        from: 'now-15m',
        to: 'now',
        mode: 'relative',
      },
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
    });

    expect(extraActions).toHaveLength(1);
  });
});
