/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSlo } from '../data/slo/slo';
import { SloEditLocatorDefinition } from './slo_edit';

describe('SloEditLocator', () => {
  const locator = new SloEditLocatorDefinition();

  it('should return correct url when empty params are provided', async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('slo');
    expect(location.path).toEqual('/slos/create?_a=()');
  });

  it('should return correct url when slo is provided', async () => {
    const location = await locator.getLocation(buildSlo({ id: 'foo' }));
    expect(location.path).toEqual(
      "/slos/edit/foo?_a=(budgetingMethod:occurrences,createdAt:'2022-12-29T10:11:12.000Z',description:'some%20description%20useful',enabled:!t,groupBy:'*',groupings:(),id:foo,indicator:(params:(filter:'baz:%20foo%20and%20bar%20%3E%202',good:'http_status:%202xx',index:some-index,timestampField:custom_timestamp,total:'a%20query'),type:sli.kql.custom),instanceId:'*',meta:(),name:'super%20important%20level%20service',objective:(target:0.98),revision:1,settings:(frequency:'1m',syncDelay:'1m'),summary:(errorBudget:(consumed:0.064,initial:0.02,isEstimated:!f,remaining:0.936),sliValue:0.99872,status:HEALTHY),tags:!(k8s,production,critical),timeWindow:(duration:'30d',type:rolling),updatedAt:'2022-12-29T10:11:12.000Z',version:2)"
    );
  });
});
