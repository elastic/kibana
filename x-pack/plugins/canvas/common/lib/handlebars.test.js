/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { testTable } from '../../canvas_plugin_src/functions/common/__tests__/fixtures/test_tables';
import { Handlebars } from './handlebars';

describe('handlebars', () => {
  it('registers math function and returns argument error', () => {
    const template = Handlebars.compile("test math: {{math rows 'mean(price * quantity)' 2}}");
    expect(template()).toBe('test math: MATH ERROR: first argument must be an array');
  });
  it('evaluates math function successfully', () => {
    const template = Handlebars.compile("test math: {{math rows 'mean(price * quantity)' 2}}");
    expect(template(testTable)).toBe('test math: 82164.33');
  });
});
