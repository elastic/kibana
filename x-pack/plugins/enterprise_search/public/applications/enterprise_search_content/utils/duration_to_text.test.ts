/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { durationToText } from './duration_to_text';

describe('durationToText', () => {
  it('should correctly turn duration into text', () => {
    expect(durationToText(moment.duration(11005, 'seconds'))).toEqual('3h 3m 25s');
  });
  it('should return -- for undefined', () => {
    expect(durationToText(undefined)).toEqual('--');
  });
});
