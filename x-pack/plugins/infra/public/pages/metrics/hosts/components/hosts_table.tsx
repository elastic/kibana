/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';
import React, { useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { NoData } from '../../../../components/empty_states';
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
        formBased: {
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
                  sourceField: 'host.os.type',
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
                '02e9d54c-bbe0-42dc-839c-55080a29838dX0': {
                  label: 'Part of RX (avg)',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'host.network.ingress.bytes',
                  isBucketed: false,
                  scale: 'ratio',
                  filter: {
                    query: 'host.network.ingress.bytes: *',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '02e9d54c-bbe0-42dc-839c-55080a29838dX1': {
                  label: 'Part of RX (avg)',
                  dataType: 'number',
                  operationType: 'max',
                  sourceField: 'metricset.period',
                  isBucketed: false,
                  scale: 'ratio',
                  filter: {
                    query: 'host.network.ingress.bytes: *',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '02e9d54c-bbe0-42dc-839c-55080a29838dX2': {
                  label: 'Part of RX (avg)',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: {
                      type: 'function',
                      name: 'divide',
                      args: [
                        {
                          type: 'function',
                          name: 'multiply',
                          args: ['02e9d54c-bbe0-42dc-839c-55080a29838dX0', 8],
                          location: {
                            min: 1,
                            max: 40,
                          },
                          text: 'average(host.network.ingress.bytes) * 8',
                        },
                        {
                          type: 'function',
                          name: 'divide',
                          args: ['02e9d54c-bbe0-42dc-839c-55080a29838dX1', 1000],
                          location: {
                            min: 45,
                            max: 73,
                          },
                          text: 'max(metricset.period) / 1000',
                        },
                      ],
                      location: {
                        min: 0,
                        max: 75,
                      },
                      text: '(average(host.network.ingress.bytes) * 8) / (max(metricset.period) / 1000)\n',
                    },
                  },
                  references: [
                    '02e9d54c-bbe0-42dc-839c-55080a29838dX0',
                    '02e9d54c-bbe0-42dc-839c-55080a29838dX1',
                  ],
                  customLabel: true,
                },
                '02e9d54c-bbe0-42dc-839c-55080a29838d': {
                  label: 'RX (avg.)',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula:
                      '(average(host.network.ingress.bytes) * 8) / (max(metricset.period) / 1000)\n',
                    isFormulaBroken: false,
                    format: {
                      id: 'bits',
                      params: {
                        decimals: 0,
                        suffix: '/s',
                      },
                    },
                  },
                  references: ['02e9d54c-bbe0-42dc-839c-55080a29838dX2'],
                  filter: {
                    query: 'host.network.ingress.bytes: *',
                    language: 'kuery',
                  },
                  customLabel: true,
                },
                '7802ef93-622c-44df-94fa-03eec01bb7b6X0': {
                  label: 'Part of TX',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'host.network.egress.bytes',
                  isBucketed: false,
                  scale: 'ratio',
                  filter: {
                    query: 'host.network.egress.bytes: *',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '7802ef93-622c-44df-94fa-03eec01bb7b6X1': {
                  label: 'Part of TX',
                  dataType: 'number',
                  operationType: 'max',
                  sourceField: 'metricset.period',
                  isBucketed: false,
                  scale: 'ratio',
                  filter: {
                    query: 'host.network.egress.bytes: *',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                '7802ef93-622c-44df-94fa-03eec01bb7b6X2': {
                  label: 'Part of TX',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: {
                      type: 'function',
                      name: 'divide',
                      args: [
                        {
                          type: 'function',
                          name: 'multiply',
                          args: ['7802ef93-622c-44df-94fa-03eec01bb7b6X0', 8],
                          location: {
                            min: 1,
                            max: 39,
                          },
                          text: 'average(host.network.egress.bytes) * 8',
                        },
                        {
                          type: 'function',
                          name: 'divide',
                          args: ['7802ef93-622c-44df-94fa-03eec01bb7b6X1', 1000],
                          location: {
                            min: 44,
                            max: 72,
                          },
                          text: 'max(metricset.period) / 1000',
                        },
                      ],
                      location: {
                        min: 0,
                        max: 74,
                      },
                      text: '(average(host.network.egress.bytes) * 8) / (max(metricset.period) / 1000)\n',
                    },
                  },
                  references: [
                    '7802ef93-622c-44df-94fa-03eec01bb7b6X0',
                    '7802ef93-622c-44df-94fa-03eec01bb7b6X1',
                  ],
                  customLabel: true,
                },
                '7802ef93-622c-44df-94fa-03eec01bb7b6': {
                  label: 'TX (avg.)',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula:
                      '(average(host.network.egress.bytes) * 8) / (max(metricset.period) / 1000)\n',
                    isFormulaBroken: false,
                    format: {
                      id: 'bits',
                      params: {
                        decimals: 0,
                        suffix: '/s',
                      },
                    },
                  },
                  references: ['7802ef93-622c-44df-94fa-03eec01bb7b6X2'],
                  filter: {
                    query: 'host.network.egress.bytes: *',
                    language: 'kuery',
                  },
                  customLabel: true,
                },
              },
              columnOrder: [
                '8d17458d-31af-41d1-a23c-5180fd960bee',
                '155fc728-d010-498e-8126-0bc46cad2be2',
                '467de550-9186-4e18-8cfa-bce07087801a',
                '3eca2307-228e-4842-a023-57e15c8c364d',
                '02e9d54c-bbe0-42dc-839c-55080a29838d',
                '7802ef93-622c-44df-94fa-03eec01bb7b6',
                '0a9bd0fa-9966-489b-8c95-70997a7aad4c',
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36f',
                '0a9bd0fa-9966-489b-8c95-70997a7aad4cX0',
                'fe5a4d7d-6f48-45ab-974c-96bc864ac36fX0',
                '3eca2307-228e-4842-a023-57e15c8c364dX0',
                '3eca2307-228e-4842-a023-57e15c8c364dX1',
                '02e9d54c-bbe0-42dc-839c-55080a29838dX0',
                '02e9d54c-bbe0-42dc-839c-55080a29838dX1',
                '02e9d54c-bbe0-42dc-839c-55080a29838dX2',
                '7802ef93-622c-44df-94fa-03eec01bb7b6X0',
                '7802ef93-622c-44df-94fa-03eec01bb7b6X1',
                '7802ef93-622c-44df-94fa-03eec01bb7b6X2',
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
            isTransposed: false,
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
            columnId: '3eca2307-228e-4842-a023-57e15c8c364d',
            isTransposed: false,
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
            isTransposed: false,
            columnId: '02e9d54c-bbe0-42dc-839c-55080a29838d',
          },
          {
            isTransposed: false,
            columnId: '7802ef93-622c-44df-94fa-03eec01bb7b6',
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
  onRefetch: () => void;
  onLoading: (isLoading: boolean) => void;
  isLensLoading: boolean;
}
export const HostsTable: React.FunctionComponent<Props> = ({
  dataView,
  timeRange,
  query,
  searchSessionId,
  onRefetch,
  onLoading,
  isLensLoading,
}) => {
  const {
    services: { lens },
  } = useKibana<InfraClientStartDeps>();
  const LensComponent = lens?.EmbeddableComponent;
  const [noData, setNoData] = useState(false);

  if (noData && !isLensLoading) {
    return (
      <NoData
        titleText={i18n.translate('xpack.infra.metrics.emptyViewTitle', {
          defaultMessage: 'There is no data to display.',
        })}
        bodyText={i18n.translate('xpack.infra.metrics.emptyViewDescription', {
          defaultMessage: 'Try adjusting your time or filter.',
        })}
        refetchText={i18n.translate('xpack.infra.metrics.refetchButtonLabel', {
          defaultMessage: 'Check for new data',
        })}
        onRefetch={onRefetch}
        testString="metricsEmptyViewState"
      />
    );
  }
  return (
    <LensComponent
      id="hostsView"
      timeRange={timeRange}
      attributes={getLensHostsTable(dataView, query)}
      searchSessionId={searchSessionId}
      onLoad={(isLoading, adapters) => {
        if (!isLoading && adapters?.tables) {
          setNoData(adapters?.tables.tables.default?.rows.length === 0);
          onLoading(false);
        }
      }}
    />
  );
};
