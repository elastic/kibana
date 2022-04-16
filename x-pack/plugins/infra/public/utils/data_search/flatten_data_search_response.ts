/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs/operators';
import { IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { ParsedDataSearchRequestDescriptor } from './types';

export const flattenDataSearchResponseDescriptor = <
  Request extends IKibanaSearchRequest,
  Response
>({
  abortController,
  options,
  request,
  response$,
}: ParsedDataSearchRequestDescriptor<Request, Response>) =>
  response$.pipe(
    map((response) => {
      return {
        abortController,
        options,
        request,
        response,
      };
    })
  );
