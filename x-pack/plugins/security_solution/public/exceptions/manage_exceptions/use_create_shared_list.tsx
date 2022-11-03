/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { HttpStart } from '@kbn/core/public';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

export const createSharedExceptionList = async ({
  name,
  description,
  http,
  signal,
}: {
  // TODO: Replace these with kbn packaged versions once we have those available to us
  // These originally came from this location below before moving them to this hacked "any" types:
  // import { HttpStart, NotificationsStart } from '../../../../../src/core/public';
  http: HttpStart;
  signal: AbortSignal;
  name: string;
  description: string;
}): Promise<ExceptionListSchema> => {
  const res: ExceptionListSchema = await http.post<ExceptionListSchema>('/api/exceptions/shared', {
    body: JSON.stringify({ name, description }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });
  return res;
};

const createSharedExceptionListWithOptionalSignal = withOptionalSignal(createSharedExceptionList);

export const useCreateSharedExceptionListWithOptionalSignal = () =>
  useAsync(createSharedExceptionListWithOptionalSignal);
