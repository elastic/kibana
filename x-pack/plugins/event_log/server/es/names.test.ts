/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsNames } from './names';

jest.mock('../../../../package.json', () => ({
  version: '1.2.3',
}));

describe('getEsNames()', () => {
  test('works as expected', () => {
    const base = 'XYZ';
    const esNames = getEsNames(base);
    expect(esNames.base).toEqual(base);
    expect(esNames.dataStream).toEqual(`${base}-event-log-ds`);
    expect(esNames.indexPattern).toEqual(`${base}-event-log-*`);
    expect(esNames.indexTemplate).toEqual(`${base}-event-log-template`);
  });
});
