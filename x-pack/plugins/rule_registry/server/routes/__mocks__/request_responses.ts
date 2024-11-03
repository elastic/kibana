/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../../common/constants';
import { requestMock } from './server';

export const getReadIndexRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${BASE_RAC_ALERTS_API_PATH}/index`,
    query: { features: 'siem' },
  });

export const getReadRequest = () =>
  requestMock.create({
    method: 'get',
    path: BASE_RAC_ALERTS_API_PATH,
    query: { id: 'alert-1' },
  });

export const getUpdateRequest = () =>
  requestMock.create({
    method: 'patch',
    path: BASE_RAC_ALERTS_API_PATH,
    body: {
      status: 'closed',
      ids: ['alert-1'],
      index: '.alerts-observability.apm.alerts*',
    },
  });

export const getReadFeatureIdsRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${BASE_RAC_ALERTS_API_PATH}/_feature_ids`,
    query: { registrationContext: ['security'] },
  });

export const getO11yBrowserFields = () =>
  requestMock.create({
    method: 'get',
    path: `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    query: { featureIds: ['apm', 'logs'] },
  });

export const getMetricThresholdAADFields = () =>
  requestMock.create({
    method: 'get',
    path: `${BASE_RAC_ALERTS_API_PATH}/aad_fields`,
    query: { ruleTypeId: 'metrics.alert.threshold' },
  });

export const getAlertsGroupAggregationsRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
    body: {
      featureIds: ['apm', 'infrastructure', 'logs', 'observability', 'slo', 'uptime'],
      groupByField: 'kibana.alert.rule.name',
      aggregations: {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
        description: {
          terms: {
            field: 'kibana.alert.rule.description',
            size: 1,
          },
        },
        usersCountAggregation: {
          cardinality: {
            field: 'user.name',
          },
        },
        hostsCountAggregation: {
          cardinality: {
            field: 'host.name',
          },
        },
        ruleTags: {
          terms: {
            field: 'kibana.alert.rule.tags',
          },
        },
      },
      filters: [
        {
          range: {
            '@timestamp': {
              gte: 'now-1y/d',
              lte: 'now',
            },
          },
        },
      ],
      pageIndex: 0,
      pageSize: 25,
    },
  });
