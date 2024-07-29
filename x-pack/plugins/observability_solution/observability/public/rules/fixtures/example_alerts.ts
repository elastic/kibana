/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';

export const inventoryThresholdAlert = [
  {
    field: 'kibana.alert.workflow_status',
    value: ['open'],
  },
  {
    field: 'kibana.alert.status',
    value: ['active'],
  },
  {
    field: 'kibana.alert.rule.uuid',
    value: ['06f53080-0f91-11ed-9d86-013908b232ef'],
  },
  {
    field: 'kibana.alert.reason',
    value: ['CPU usage is 106.5% in the last 1 min for host-0. Alert when > 1%.'],
  },
  {
    field: 'kibana.alert.rule.producer',
    value: ['infrastructure'],
  },
  {
    field: 'kibana.alert.rule.consumer',
    value: ['alerts'],
  },
  {
    field: 'kibana.alert.rule.category',
    value: ['Inventory'],
  },
  {
    field: 'kibana.alert.start',
    value: ['2022-07-29T22:51:51.904Z'],
  },
  {
    field: 'event.action',
    value: ['open'],
  },
  {
    field: 'kibana.alert.rule.rule_type_id',
    value: ['metrics.alert.inventory.threshold'],
  },
  {
    field: 'kibana.alert.duration.us',
    value: [0],
  },
  {
    field: '@timestamp',
    value: ['2022-07-29T22:51:51.904Z'],
  },
  {
    field: 'kibana.alert.instance.id',
    value: ['host-0'],
  },
  {
    field: 'kibana.alert.rule.name',
    value: ['Test Alert'],
  },
  {
    field: 'kibana.space_ids',
    value: ['default'],
  },
  {
    field: 'kibana.alert.uuid',
    value: ['6d4c6d74-d51a-495c-897d-88ced3b95e30'],
  },
  {
    field: 'kibana.alert.rule.execution.uuid',
    value: ['b8cccff3-2d3e-41d0-a91e-6aae8efce8ba'],
  },
  {
    field: 'kibana.version',
    value: ['8.5.0'],
  },
  {
    field: 'event.kind',
    value: ['signal'],
  },
  {
    field: 'kibana.alert.rule.parameters',
    value: [
      {
        sourceId: 'default',
        criteria: [
          {
            comparator: '>',
            timeSize: 1,
            metric: 'cpu',
            threshold: [1],
            customMetric: {
              field: '',
              aggregation: 'avg',
              id: 'alert-custom-metric',
              type: 'custom',
            },
            timeUnit: 'm',
          },
        ],
        nodeType: 'host',
      },
    ],
  },
  {
    field: '_id',
    value: '6d4c6d74-d51a-495c-897d-88ced3b95e30',
  },
  {
    field: '_index',
    value: '.internal.alerts-observability.metrics.alerts-default-000001',
  },
];

export const inventoryThresholdAlertEs = inventoryThresholdAlert.reduce(
  (acc, d) => ({ ...acc, [d.field]: d.value }),
  {}
) as EcsFieldsResponse;
