/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { useLocation, useParams } from 'react-router-dom';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { routes } from '../routes';

function getQueryParams(location: ReturnType<typeof useLocation>) {
  const urlSearchParms = new URLSearchParams(location.search);
  const queryParams: Record<string, string> = {};
  urlSearchParms.forEach((value, key) => {
    queryParams[key] = value;
  });
  return queryParams;
}

export function useUrlParams<T extends keyof typeof routes>(route: typeof routes[T]) {
  const location = useLocation();
  const pathParams = useParams();
  const queryParams = getQueryParams(location);

  const { params } = route;
  const rts = {
    queryRt: 'query' in params ? t.exact(params.query) : t.strict({}),
    pathRt: 'path' in params ? t.exact(params.path) : t.strict({}),
  };

  const queryResult = rts.queryRt.decode(queryParams);
  const pathResult = rts.pathRt.decode(pathParams);
  if (isLeft(queryResult)) {
    // eslint-disable-next-line no-console
    console.error(PathReporter.report(queryResult)[0]);
  }

  if (isLeft(pathResult)) {
    // eslint-disable-next-line no-console
    console.error(PathReporter.report(pathResult)[0]);
  }

  return {
    query: isLeft(queryResult) ? {} : queryResult.right,
    path: isLeft(pathResult) ? {} : pathResult.right,
  };
}
