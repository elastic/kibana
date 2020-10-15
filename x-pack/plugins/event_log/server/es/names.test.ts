/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEsNames } from './names';

jest.mock('../lib/../../../../package.json', () => ({
  version: '1.2.3',
}));

describe('getEsNames()', () => {
  test('works as expected', () => {
    const base = 'XYZ';
    const version = '1.2.3';
    const esNames = getEsNames(base);
    expect(esNames.base).toEqual(base);
    expect(esNames.alias).toEqual(`${base}-event-log-${version}`);
    expect(esNames.ilmPolicy).toEqual(`${base}-event-log-policy`);
    expect(esNames.indexPattern).toEqual(`${base}-event-log-*`);
    expect(esNames.indexPatternWithVersion).toEqual(`${base}-event-log-${version}-*`);
    expect(esNames.initialIndex).toEqual(`${base}-event-log-${version}-000001`);
    expect(esNames.indexTemplate).toEqual(`${base}-event-log-${version}-template`);
  });

  test('ilm policy name does not contain dot prefix', () => {
    const base = '.XYZ';
    const esNames = getEsNames(base);
    expect(esNames.ilmPolicy).toEqual('XYZ-event-log-policy');
  });
});
