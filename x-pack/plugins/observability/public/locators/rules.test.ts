/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesLocatorDefinition, RULES_PATH } from './rules';

describe('RulesLocator', () => {
  const locator = new RulesLocatorDefinition();

  it('should return correct url when empty params are provided', async () => {
    const location = await locator.getLocation({});
    expect(location.app).toEqual('observability');
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(),params:(),search:'',status:!(),type:!())`
    );
  });

  it('should return correct url when lastResponse is provided', async () => {
    const location = await locator.getLocation({ lastResponse: ['foo'] });
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(foo),params:(),search:'',status:!(),type:!())`
    );
  });

  it('should return correct url when params is provided', async () => {
    const location = await locator.getLocation({ params: { sloId: 'foo' } });
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(),params:(sloId:foo),search:'',status:!(),type:!())`
    );
  });

  it('should return correct url when search is provided', async () => {
    const location = await locator.getLocation({ search: 'foo' });
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(),params:(),search:foo,status:!(),type:!())`
    );
  });

  it('should return correct url when status is provided', async () => {
    const location = await locator.getLocation({ status: ['enabled'] });
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(),params:(),search:'',status:!(enabled),type:!())`
    );
  });

  it('should return correct url when type is provided', async () => {
    const location = await locator.getLocation({ type: ['foo'] });
    expect(location.path).toEqual(
      `${RULES_PATH}?_a=(lastResponse:!(),params:(),search:'',status:!(),type:!(foo))`
    );
  });
});
