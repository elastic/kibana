/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRequestOptionsMock } from '../../../../../../common/search_strategy/security_solution/cti/index.mock';
import { buildEventEnrichmentQuery } from './query';

describe('buildEventEnrichmentQuery', () => {
  it('converts each event field/value into a named filter', () => {
    const options = buildRequestOptionsMock();
    const query = buildEventEnrichmentQuery(options);
    expect(query.body?.query?.bool?.filter).toEqual(expect.objectContaining({ foo: 'bar' }));
  });

  it.todo('filters on indicator events');
  it.todo('includes the specified timerange');
});
