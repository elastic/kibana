/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import {
  CoreKibanaRequest,
  type KibanaRequest,
  SECURITY_EXTENSION_ID,
  type CoreStart,
} from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';

import type { Range } from '../../../../common/risk_engine';

export const convertDateToISOString = (dateString: string): string => {
  const date = datemath.parse(dateString);

  if (date?.isValid()) {
    return date.toISOString();
  } else {
    throw new Error(`Could not convert string "${dateString}" to ISO string`);
  }
};

export const convertRangeToISO = (range: Range): Range => ({
  start: convertDateToISOString(range.start),
  end: convertDateToISOString(range.end),
});

const buildFakeScopedRequest = ({
  coreStart,
  namespace,
}: {
  coreStart: CoreStart;
  namespace: string;
}): KibanaRequest => {
  const rawRequest = {
    headers: {},
    path: '/',
  };

  const request = CoreKibanaRequest.from(rawRequest);
  const scopedPath = addSpaceIdToPath('/', namespace);

  coreStart.http.basePath.set(request, scopedPath);

  return request;
};

export const buildScopedInternalSavedObjectsClient = ({
  coreStart,
  namespace,
}: {
  coreStart: CoreStart;
  namespace: string;
}) => {
  const fakeScopedRequest = buildFakeScopedRequest({ coreStart, namespace });

  return coreStart.savedObjects.getScopedClient(fakeScopedRequest, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  });
};
