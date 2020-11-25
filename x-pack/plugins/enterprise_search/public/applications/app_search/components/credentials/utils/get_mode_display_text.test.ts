/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiTokenTypes } from '../constants';
import { ApiToken } from '../types';

import { getModeDisplayText } from './get_mode_display_text';

const apiToken: ApiToken = {
  name: '',
  type: ApiTokenTypes.Private,
  read: true,
  write: true,
  access_all_engines: true,
  engines: ['engine1', 'engine2', 'engine3'],
};

describe('getModeDisplayText', () => {
  it('will return read/write when read and write are enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: true, write: true })).toEqual('read/write');
  });

  it('will return read-only when only read is enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: true, write: false })).toEqual('read-only');
  });

  it('will return write-only when only write is enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: false, write: true })).toEqual('write-only');
  });

  it('will return "search" if the key is a search key, regardless of read/write state', () => {
    expect(
      getModeDisplayText({ ...apiToken, type: ApiTokenTypes.Search, read: false, write: true })
    ).toEqual('search');
  });

  it('will return "--" if the key is an admin key, regardless of read/write state', () => {
    expect(
      getModeDisplayText({ ...apiToken, type: ApiTokenTypes.Admin, read: false, write: true })
    ).toEqual('--');
  });

  it('will default read and write to false', () => {
    expect(
      getModeDisplayText({
        name: 'test',
        type: ApiTokenTypes.Private,
      })
    ).toEqual('read-only');
  });
});
