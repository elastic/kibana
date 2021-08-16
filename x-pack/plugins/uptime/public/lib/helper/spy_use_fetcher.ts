/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as observabilityPublic from '../../../../observability/public';

jest.mock('../../../../observability/public', () => {
  const originalModule = jest.requireActual('../../../../observability/public');

  return {
    ...originalModule,
    useFetcher: jest.fn().mockReturnValue({
      data: null,
      status: 'success',
    }),
    useTrackPageview: jest.fn(),
  };
});

export function spyOnUseFetcher(payload: unknown) {
  jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
    status: observabilityPublic.FETCH_STATUS.SUCCESS,
    data: payload,
    refetch: () => null,
  });
}
