/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMakiSymbol, styleSvg } from './symbol_utils';

describe('getMakiSymbol', () => {
  it('Should load symbol', () => {
    const symbol = getMakiSymbol('aerialway');
    expect(symbol.svg.length).toBe(624);
    expect(symbol.label).toBe('Aerialway');
  });
});

describe('styleSvg', () => {
  it('Should not add style property when style not provided', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString);
    expect(styledSvg).toMatchSnapshot();
  });

  it('Should add fill style property to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red');
    expect(styledSvg).toMatchSnapshot();
  });

  it('Should add stroke and stroke-wdth style properties to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red', 'white');
    expect(styledSvg).toMatchSnapshot();
  });

  it('Should override any inherent fill and stroke styles in SVGs', async () => {
    const unstyledSvgString = `
      <svg version="1.1" id="square-11" xmlns="http://www.w3.org/2000/svg" width="11px" height="11px" viewBox="0 0 11 11">
          <g>
              <path style="fill: #54B399; stroke: #C57127" d="M9,10H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h7c0.5523,0,1,0.4477,1,1v7C10,9.5523,9.5523,10,9,10z" />
          </g>
      </svg>
    `;

    const styledSvg = await styleSvg(unstyledSvgString, 'blue', 'black');
    expect(styledSvg).toMatchSnapshot();
  })
});

