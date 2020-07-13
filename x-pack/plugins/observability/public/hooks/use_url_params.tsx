/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { useLocation, useParams } from 'react-router-dom';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Params } from '../routes';

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
export function useUrlParams(params: Params) {
  const location = useLocation();
  const pathParams = useParams();
  const queryParams = getQueryParams(location);

  const rts = {
    queryRt: params.query ? t.exact(params.query) : t.strict({}),
    pathRt: params.path ? t.exact(params.path) : t.strict({}),
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
