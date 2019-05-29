/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSymbolSvg } from './symbols';

describe('getSymbolSvg', () => {
  it('Should load symbol svg', () => {
    const svgString = getSymbolSvg('aerialway 11');
    expect(svgString.length).toBe(643);
  });
});
