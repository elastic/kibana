/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ADMIN,
  PRIVATE,
  READ_ONLY,
  READ_WRITE,
  SEARCH,
  SEARCH_DISPLAY,
  WRITE_ONLY,
} from '../constants';
import { IApiToken } from '../types';

import { getModeDisplayText } from './get_mode_display_text';

const apiToken: IApiToken = {
  name: '',
  type: PRIVATE,
  read: true,
  write: true,
  access_all_engines: true,
  engines: ['engine1', 'engine2', 'engine3'],
};

describe('getModeDisplayText', () => {
  it('will return read/write when read and write are enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: true, write: true })).toEqual(READ_WRITE);
  });

  it('will return read-only when only read is enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: true, write: false })).toEqual(READ_ONLY);
  });

  it('will return write-only when only write is enabled', () => {
    expect(getModeDisplayText({ ...apiToken, read: false, write: true })).toEqual(WRITE_ONLY);
  });

  it('will return "search" if they key is a search key, regardless of read/write state', () => {
    expect(getModeDisplayText({ ...apiToken, type: SEARCH, read: false, write: true })).toEqual(
      SEARCH_DISPLAY
    );
  });

  it('will return "--" if they key is an admin key, regardless of read/write state', () => {
    expect(getModeDisplayText({ ...apiToken, type: ADMIN, read: false, write: true })).toEqual(
      '--'
    );
  });

  it('will default read and write to false', () => {
    expect(
      getModeDisplayText({
        name: 'test',
        type: PRIVATE,
      })
    ).toEqual(READ_ONLY);
  });
});
