/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadMakiSvg } from './load_maki_svg';

describe('loadMakiSvg', () => {
  it('Should load maki svg', () => {
    const svgString = loadMakiSvg('aerialway-11');
    expect(svgString.length).toBe(643);
  });
});
