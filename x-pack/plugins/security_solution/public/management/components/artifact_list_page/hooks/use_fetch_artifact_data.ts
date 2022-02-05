/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchHostIsolationExceptionsList } from '../../../pages/host_isolation_exceptions/view/hooks';

export const useFetchArtifactData = (
  apiClient: unknown /* FIXME:PT type should be: ExceptionsListApiClient */
) => {
  // FIXME:PT replace once generic hooks are available

  return useFetchHostIsolationExceptionsList({ page: 0, perPage: 20 });
};
