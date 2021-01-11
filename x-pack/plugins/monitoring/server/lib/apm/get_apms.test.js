/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultResponseSort } from '../helpers';
import { handleResponse } from './get_apms';

describe('apm/get_apms', () => {
  it('Timestamp is desc', () => {
    const { beats, version } = defaultResponseSort(handleResponse);
    expect(beats[0].version).toEqual(version[0]);
    expect(beats[1].version).toEqual(version[1]);
    expect(beats[2].version).toEqual(version[2]);
  });
});
