/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';
import { SavedObjectsFindResult } from '@kbn/core/server';
import moment from 'moment';
import { SearchSessionSavedObjectAttributes } from '@kbn/data-plugin/common';

/**
 * Generate the hash for this request so that, in the future, this hash can be used to look up
 * existing search IDs for this request. Ignores the `preference` parameter since it generally won't
 * match from one request to another identical request.
 */
export function createRequestHash(keys: Record<any, any>) {
  const { preference, ...params } = keys;
  return createHash(`sha256`).update(stringify(params)).digest('hex');
}

export function isSearchSessionExpired(
  session: SavedObjectsFindResult<SearchSessionSavedObjectAttributes>
) {
  return moment(session.attributes.expires).isBefore(moment());
}
