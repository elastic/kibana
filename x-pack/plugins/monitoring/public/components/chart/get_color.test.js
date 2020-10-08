/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getColor } from './get_color';

describe('getColors', function () {
  it('elasticsearch colors', () => {
    expect(getColor('elasticsearch', 0)).to.be('#3ebeb0');
    expect(getColor('elasticsearch', 1)).to.be('#3b73ac');
    expect(getColor('elasticsearch', 2)).to.be('#f08656');
    expect(getColor('elasticsearch', 3)).to.be('#6c478f');
    expect(getColor('elasticsearch', 4)).to.be('#000');
    expect(getColor('elasticsearch', 10)).to.be('#000');
  });

  it('kibana colors', () => {
    expect(getColor('kibana', 0)).to.be('#e8488b');
    expect(getColor('kibana', 1)).to.be('#3b73ac');
    expect(getColor('kibana', 2)).to.be('#3cab63');
    expect(getColor('kibana', 3)).to.be('#6c478f');
    expect(getColor('kibana', 4)).to.be('#000');
    expect(getColor('kibana', 10)).to.be('#000');
  });
});
