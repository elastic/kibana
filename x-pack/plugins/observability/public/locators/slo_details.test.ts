/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloDetailsLocatorDefinition, getSloDetailsPath } from './slo_details';

describe('SloDetailsLocator', () => {
  const locator = new SloDetailsLocatorDefinition();

  it('should return correct url when empty params are provided', async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(`${getSloDetailsPath('')}`);
  });

  it('should return correct url when sloId is provided', async () => {
    const location = await locator.getLocation({ sloId: 'foo' });
    expect(location.path).toEqual(`${getSloDetailsPath('foo')}`);
  });
});
