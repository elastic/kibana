/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';

jest.mock('@kbn/observability-shared-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/observability-shared-plugin/public');

  return {
    ...originalModule,
    useFetcher: jest.fn().mockReturnValue({
      data: null,
      status: 'success',
    }),
    useTrackPageview: jest.fn(),
  };
});

export function spyOnUseFetcher(
  payload: unknown,
  status = observabilitySharedPublic.FETCH_STATUS.SUCCESS
) {
  return jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
    status,
    data: payload,
    refetch: () => null,
  });
}
