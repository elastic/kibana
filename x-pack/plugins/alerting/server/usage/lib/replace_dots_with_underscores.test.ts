/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceDotSymbols } from './replace_dots_with_underscores';

describe('replaceDotSymbols', () => {
  test('should replace "." symbols with "__" in string', async () => {
    expect(replaceDotSymbols('.index-threshold')).toEqual('__index-threshold');
  });
});
