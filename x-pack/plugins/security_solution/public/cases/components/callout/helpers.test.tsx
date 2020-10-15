/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import md5 from 'md5';
import { createCalloutId } from './helpers';

describe('createCalloutId', () => {
  it('creates id correctly with one id', () => {
    const digest = md5('one');
    const id = createCalloutId(['one']);
    expect(id).toBe(digest);
  });

  it('creates id correctly with multiples ids', () => {
    const digest = md5('one|two|three');
    const id = createCalloutId(['one', 'two', 'three']);
    expect(id).toBe(digest);
  });

  it('creates id correctly with multiples ids and delimiter', () => {
    const digest = md5('one,two,three');
    const id = createCalloutId(['one', 'two', 'three'], ',');
    expect(id).toBe(digest);
  });
});
