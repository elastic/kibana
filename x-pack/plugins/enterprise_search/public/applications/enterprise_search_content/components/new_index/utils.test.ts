/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { getLanguageForOptimization } from './utils';

describe('getLanguageForOptimizatioin', () => {
  it('returns null for the universal language option', () => {
    expect(getLanguageForOptimization(UNIVERSAL_LANGUAGE_VALUE)).toEqual(null);
  });

  it('returns the language code for non-Universal languageoptions', () => {
    expect(getLanguageForOptimization('zh')).toEqual('zh');
  });
});
