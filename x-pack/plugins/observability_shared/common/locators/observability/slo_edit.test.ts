/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { OBSERVABILITY_APP_BASE_PATH } from '../../constants';
import { ObservabilitySloEditLocator } from './slo_edit';

const now = '2022-12-29T10:11:12.000Z';

const baseSlo: SLOWithSummaryResponse = {
  id: 'foo',
  name: 'super important level service',
  description: 'some description useful',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'some-index',
      filter: 'baz: foo and bar > 2',
      good: 'http_status: 2xx',
      total: 'a query',
      timestampField: 'custom_timestamp',
    },
  },
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: { target: 0.98 },
  budgetingMethod: 'occurrences',
  revision: 1,
  settings: {
    syncDelay: '1m',
    frequency: '1m',
  },
  summary: {
    status: 'HEALTHY',
    sliValue: 0.99872,
    errorBudget: {
      initial: 0.02,
      consumed: 0.064,
      remaining: 0.936,
      isEstimated: false,
    },
  },
  tags: ['k8s', 'production', 'critical'],
  enabled: true,
  createdAt: now,
  updatedAt: now,
};

describe('SloEditLocator', () => {
  const locator = new ObservabilitySloEditLocator();

  it('should return correct url when empty params are provided', async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(`${OBSERVABILITY_APP_BASE_PATH}/slos/create?_a=()`);
  });

  it('should return correct url when slo is provided', async () => {
    const location = await locator.getLocation(baseSlo);
    expect(location.path).toEqual(
      `${OBSERVABILITY_APP_BASE_PATH}/slos/edit/foo?_a=(budgetingMethod:occurrences,createdAt:'2022-12-29T10:11:12.000Z',description:'some%20description%20useful',enabled:!t,id:foo,indicator:(params:(filter:'baz:%20foo%20and%20bar%20%3E%202',good:'http_status:%202xx',index:some-index,timestampField:custom_timestamp,total:'a%20query'),type:sli.kql.custom),name:'super%20important%20level%20service',objective:(target:0.98),revision:1,settings:(frequency:'1m',syncDelay:'1m'),summary:(errorBudget:(consumed:0.064,initial:0.02,isEstimated:!f,remaining:0.936),sliValue:0.99872,status:HEALTHY),tags:!(k8s,production,critical),timeWindow:(duration:'30d',type:rolling),updatedAt:'2022-12-29T10:11:12.000Z')`
    );
  });
});
