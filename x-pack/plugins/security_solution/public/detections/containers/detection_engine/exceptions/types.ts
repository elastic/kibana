/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export interface GetExceptionFilterOptionalProps {
  signal?: AbortSignal;
  chunkSize?: number;
  alias?: string;
  excludeExceptions?: boolean;
}

export interface GetExceptionFilterFromExceptionListIdProps
  extends GetExceptionFilterOptionalProps {
  exceptionListId: string;
}

export interface GetExceptionFilterFromExceptionsProps extends GetExceptionFilterOptionalProps {
  exceptions: ExceptionListItemSchema[];
}

export interface ExceptionFilterResponse {
  filter: Filter;
}
