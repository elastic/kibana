/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEsNames } from './names';

describe('getEsNames()', () => {
  test('works as expected', () => {
    const base = 'XYZ';
    const esNames = getEsNames(base);
    expect(esNames.base).toEqual(base);
    expect(esNames.alias).toEqual(`${base}-event-log`);
    expect(esNames.ilmPolicy).toEqual(`${base}-event-log-policy`);
    expect(esNames.indexPattern).toEqual(`${base}-event-log-*`);
    expect(esNames.initialIndex).toEqual(`${base}-event-log-000001`);
    expect(esNames.indexTemplate).toEqual(`${base}-event-log-template`);
  });
});
