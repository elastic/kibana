/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStyledSvg } from './get_styled_svg';

describe('getStyledSvg', () => {
  it('Should not add style property when fill not provided', async () => {
    const unstyledSvgString = '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await getStyledSvg(unstyledSvgString);
    expect(styledSvg.split('\n')[1]).toBe('<svg version=\"1.1\" width=\"11px\" height=\"11px\" viewBox=\"0 0 11 11\">');
  });

  it('Should add style property to svg element', async () => {
    const unstyledSvgString = '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await getStyledSvg(unstyledSvgString, 'red');
    // eslint-disable-next-line max-len
    expect(styledSvg.split('\n')[1]).toBe('<svg version=\"1.1\" width=\"11px\" height=\"11px\" viewBox=\"0 0 11 11\" style=\"fill: red;\">');
  });
});
