/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
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
