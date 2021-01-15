/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, OperatorFunction } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
import { useLatest, useObservable } from '../use_observable';
import { DataSearchRequestDescriptor, DataSearchResponseDescriptor } from './types';

export const useFlattenedResponse = <Request extends IKibanaSearchRequest, RawResponse, Response>(
  requests$: Observable<DataSearchRequestDescriptor<Request, RawResponse>>,
  project: OperatorFunction<
    DataSearchRequestDescriptor<Request, RawResponse>,
    DataSearchResponseDescriptor<Request, Response>
  >
) => {
  const latestProject = useLatest(project);

  const latestResponse$: Observable<
    DataSearchResponseDescriptor<Request, Response>
  > = useObservable(
    (inputs$) =>
      inputs$.pipe(switchMap(([currentRequests$]) => latestProject.current(currentRequests$))),
    [requests$] as const
  );

  return latestResponse$;
};
