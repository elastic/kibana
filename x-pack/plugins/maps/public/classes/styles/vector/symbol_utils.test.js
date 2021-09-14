/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMakiSymbolSvg, styleSvg } from './symbol_utils';

describe('getMakiSymbolSvg', () => {
  it('Should load symbol svg', () => {
    const svgString = getMakiSymbolSvg('aerialway');
    expect(svgString.length).toBe(624);
  });
});

describe('styleSvg', () => {
  it('Should not add style property when style not provided', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString);
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11">'
    );
  });

  it('Should add fill style property to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red');
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11" style="fill:red;">'
    );
  });

  it('Should add stroke and stroke-wdth style properties to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red', 'white');
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11" style="fill:red;stroke:white;stroke-width:1;">'
    );
  });
});
