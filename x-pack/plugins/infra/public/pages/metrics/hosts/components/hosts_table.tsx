/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { InfraClientStartDeps } from '../../../../types';

const getLensHostsTable = (
  metricsDataView: DataView,
  query: Query
): TypedLensByValueInput['attributes'] =>
  ({
    visualizationType: 'lnsDatatable',
    title: 'Lens visualization',
    references: [
      {
        id: metricsDataView.id,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: metricsDataView.id,
        name: 'indexpattern-datasource-layer-cbe5d8a0-381d-49bf-b8ac-f8f312ec7129',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            'cbe5d8a0-381d-49bf-b8ac-f8f312ec7129': {
              columns: {
                '8d17458d-31af-41d1-a23c-5180fd960bee': {
                  label: 'Name',
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'host.name',
                  isBucketed: true,
                  params: {
                    size: 10000,
                    orderBy: {
                      type: 'column',
                      columnId: '467de550-9186-4e18-8cfa-bce07087801a',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                  },
                  customLabel: true,
                },
                '155fc728-d010-498e-8126-0bc46cad2be2': {
                  label: 'Operating system',
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'host.os.name',
                  isBucketed: true,
                  params: {
                    size: 10000,
                    orderBy: {
                      type: 'column',
                      columnId: '467de550-9186-4e18-8cfa-bce07087801a',
                    },
                    orderDirection: 'desc',
                    otherBucket: false,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                  },
                  customLabel: true,
                },
                '467de550-9186-4e18-8cfa-bce07087801a': {
                  label: '# of CPUs',
                  dataType: 'number',
                  operationType: 'max',
                  sourceField: 'system.cpu.cores',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: true,
                  },
                  customLabel: true,
                },
                '0a9bd0fa-9966-489b-8c95-70997a7aad4cX0': {
                  label: 'Part of Memory Total (avg)',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'system.memory.total',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '0a9bd0fa-9966-489b-8c95-70997a7aad4c': {
                  label: 'Memory total (avg.)',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula: 'average(system.memory.total)',
                    isFormulaBroken: false,
                    format: {
                      id: 'bytes',
                      params: {
                        decimals: 0,
                      },
                    },
                  },
                  references: ['0a9bd0fa-9966-489b-8c95-70997a7aad4cX0'],
                  customLabel: true,
                },
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36fX0': {
                  label: 'Part of Memory Usage (avg)',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'system.memory.used.pct',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36f': {
                  label: 'Memory usage (avg.)',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula: 'average(system.memory.used.pct)',
                    isFormulaBroken: false,
                    format: {
                      id: 'percent',
                      params: {
                        decimals: 0,
                      },
                    },
                  },
                  references: ['fe5a4d7d-6f48-45ab-974c-96bc864ac36fX0'],
                  customLabel: true,
                },
                '3eca2307-228e-4842-a023-57e15c8c364dX0': {
                  label: 'Part of Disk Latency (avg ms)',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'system.diskio.io.time',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '3eca2307-228e-4842-a023-57e15c8c364dX1': {
                  label: 'Part of Disk Latency (avg ms)',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: {
                      type: 'function',
                      name: 'divide',
                      args: ['3eca2307-228e-4842-a023-57e15c8c364dX0', 1000],
                      location: {
                        min: 0,
                        max: 37,
                      },
                      text: 'average(system.diskio.io.time) / 1000',
                    },
                  },
                  references: ['3eca2307-228e-4842-a023-57e15c8c364dX0'],
                  customLabel: true,
                },
                '3eca2307-228e-4842-a023-57e15c8c364d': {
                  label: 'Disk latency (avg.)',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula: 'average(system.diskio.io.time) / 1000',
                    isFormulaBroken: false,
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                        suffix: 'ms',
                      },
                    },
                  },
                  references: ['3eca2307-228e-4842-a023-57e15c8c364dX1'],
                  customLabel: true,
                },
              },
              columnOrder: [
                '8d17458d-31af-41d1-a23c-5180fd960bee',
                '155fc728-d010-498e-8126-0bc46cad2be2',
                '467de550-9186-4e18-8cfa-bce07087801a',
                '3eca2307-228e-4842-a023-57e15c8c364d',
                '0a9bd0fa-9966-489b-8c95-70997a7aad4c',
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36f',
                '0a9bd0fa-9966-489b-8c95-70997a7aad4cX0',
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36fX0',
                '3eca2307-228e-4842-a023-57e15c8c364dX0',
                '3eca2307-228e-4842-a023-57e15c8c364dX1',
              ],
              incompleteColumns: {},
              indexPatternId: '305688db-9e02-4046-acc1-5d0d8dd73ef6',
            },
          },
        },
      },
      visualization: {
        layerId: 'cbe5d8a0-381d-49bf-b8ac-f8f312ec7129',
        layerType: 'data',
        columns: [
          {
            columnId: '8d17458d-31af-41d1-a23c-5180fd960bee',
            width: 296.16666666666663,
          },
          {
            columnId: '155fc728-d010-498e-8126-0bc46cad2be2',
            isTransposed: false,
            width: 152.36666666666667,
          },
          {
            columnId: '467de550-9186-4e18-8cfa-bce07087801a',
            isTransposed: false,
            width: 121.11666666666667,
          },
          {
            columnId: '0a9bd0fa-9966-489b-8c95-70997a7aad4c',
            isTransposed: false,
          },
          {
            columnId: 'fe5a4d7d-6f48-45ab-974c-96bc864ac36f',
            isTransposed: false,
          },
          {
            columnId: '3eca2307-228e-4842-a023-57e15c8c364d',
            isTransposed: false,
          },
        ],
        paging: {
          size: 10,
          enabled: true,
        },
        headerRowHeight: 'custom',
        headerRowHeightLines: 2,
        rowHeight: 'single',
        rowHeightLines: 1,
      },
      filters: [],
      query,
    },
  } as TypedLensByValueInput['attributes']);

interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  query: Query;
  searchSessionId: string;
}
export const HostsTable: React.FunctionComponent<Props> = ({
  dataView,
  timeRange,
  query,
  searchSessionId,
}) => {
  const {
    services: { lens },
  } = useKibana<InfraClientStartDeps>();
  const LensComponent = lens?.EmbeddableComponent;

  return (
    <LensComponent
      id="hostsView"
      timeRange={timeRange}
      attributes={getLensHostsTable(dataView, query)}
      searchSessionId={searchSessionId}
    />
  );
};
