/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { isEmpty } from 'lodash/fp';
import { HostLastFirstSeenRequestOptions } from './types';

export const buildLastFirstSeenHostQuery = ({
  hostName,
  defaultIndex,
  docValueFields,
}: HostLastFirstSeenRequestOptions) => {
  const filter = [{ term: { 'host.name': hostName } }];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        firstSeen: { min: { field: '@timestamp' } },
        lastSeen: { max: { field: '@timestamp' } },
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
