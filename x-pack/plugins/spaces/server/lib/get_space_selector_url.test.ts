/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceSelectorUrl } from './get_space_selector_url';

describe('getSpaceSelectorUrl', () => {
  it('returns / when no server base path is defined', () => {
    expect(getSpaceSelectorUrl('')).toEqual('/spaces/space_selector');
  });

  it('returns the server base path when defined', () => {
    expect(getSpaceSelectorUrl('/my/server/base/path')).toEqual(
      '/my/server/base/path/spaces/space_selector'
    );
  });
});
