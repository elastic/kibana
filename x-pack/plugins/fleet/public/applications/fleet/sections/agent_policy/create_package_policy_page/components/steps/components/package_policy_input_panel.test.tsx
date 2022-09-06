/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldShowStreamsByDefault } from './package_policy_input_panel';

describe('shouldShowStreamsByDefault', () => {
  it('should return true if a datastreamId is provided and contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeTruthy();
  });

  it('should return false if a datastreamId is provided but not contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-1',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });

  it('should return false if a datastreamId is provided but the input is disabled', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: false,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });
});
