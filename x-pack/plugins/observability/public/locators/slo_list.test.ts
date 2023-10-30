/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloListLocatorDefinition } from './slo_list';

describe('SloListLocator', () => {
  const locator = new SloListLocatorDefinition();

  it("returns the correct url with the default search state when no 'kqlQuery' provided", async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(
      "/slos?search=(kqlQuery:'',page:0,sort:(by:status,direction:desc))"
    );
  });

  it("returns the correct url with the 'kqlQuery' provided", async () => {
    const location = await locator.getLocation({
      kqlQuery: 'slo.name: "Service Availability" and slo.indicator.type : "sli.kql.custom"',
    });
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(
      "/slos?search=(kqlQuery:'slo.name:%20%22Service%20Availability%22%20and%20slo.indicator.type%20:%20%22sli.kql.custom%22',page:0,sort:(by:status,direction:desc))"
    );
  });
});
