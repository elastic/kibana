/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as legacyElasticsearch from 'elasticsearch';

const esErrorsParent = legacyElasticsearch.errors._Abstract;

export function isEsError(err: Error): boolean {
  return err instanceof esErrorsParent;
}
