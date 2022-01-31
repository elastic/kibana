/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getFormattedSuccessRatio } from './monitoring_utils';

describe('monitoring_utils', () => {
  it('should return a decimal as a percent', () => {
    expect(getFormattedSuccessRatio(0.66)).toEqual('66%');
    expect(getFormattedSuccessRatio(0.75345345345345)).toEqual('75%');
  });
});
