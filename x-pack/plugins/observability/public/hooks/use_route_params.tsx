/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { useLocation, useParams } from 'react-router-dom';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Params, RouteParams, routes } from '../routes';

function getQueryParams(location: ReturnType<typeof useLocation>) {
  const urlSearchParms = new URLSearchParams(location.search);
  const queryParams: Record<string, string> = {};
  urlSearchParms.forEach((value, key) => {
    queryParams[key] = value;
  });
  return queryParams;
}

/**
 * Extracts query and path params from the url and validate it against the type defined in the route file.
 * It removes any aditional item which is not declared in the type.
 * @param params
 */
export function useRouteParams<T extends keyof typeof routes>(pathName: T): RouteParams<T> {
  const location = useLocation();
  const pathParams = useParams();
  const queryParams = getQueryParams(location);
  const { query, path } = routes[pathName].params as Params;

  const rts = {
    queryRt: query ? t.exact(query) : t.strict({}),
    pathRt: path ? t.exact(path) : t.strict({}),
  };

  const queryResult = rts.queryRt.decode(queryParams);
  const pathResult = rts.pathRt.decode(pathParams);
  if (isLeft(queryResult)) {
    console.error(PathReporter.report(queryResult)[0]);
  }

  if (isLeft(pathResult)) {
    console.error(PathReporter.report(pathResult)[0]);
  }

  return ({
    query: isLeft(queryResult) ? {} : queryResult.right,
    path: isLeft(pathResult) ? {} : pathResult.right,
  } as unknown) as RouteParams<T>;
}
