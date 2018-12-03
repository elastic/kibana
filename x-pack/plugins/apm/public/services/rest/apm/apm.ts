/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Span } from 'x-pack/plugins/apm/typings/Span';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
// @ts-ignore
import { convertKueryToEsQuery } from '../../kuery';
// @ts-ignore
import { getAPMIndexPattern } from '../savedObjects';

export async function getEncodedEsQuery(kuery?: string) {
  if (!kuery) {
    return;
  }

  const indexPattern = await getAPMIndexPattern();
  if (!indexPattern) {
    return;
  }

  const esFilterQuery = convertKueryToEsQuery(kuery, indexPattern);
  return encodeURIComponent(JSON.stringify(esFilterQuery));
}

export function addVersion<T extends Span | Transaction | null | undefined>(
  item: T
): T {
  if (item != null) {
    item.version = item.hasOwnProperty('trace') ? 'v2' : 'v1';
  }

  return item;
}
