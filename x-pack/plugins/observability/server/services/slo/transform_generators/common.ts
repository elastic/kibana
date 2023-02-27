/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { InvalidTransformError } from '../../../errors';

export function getElastichsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}

export function parseIndex(index: string): string | string[] {
  if (index.indexOf(',') > -1) {
    if (index.indexOf(':') > -1) {
      const indexParts = index.split(':'); // "remote_name:foo-*,bar*"
      const remoteName = indexParts[0];
      return indexParts[1].split(',').map((idx) => `${remoteName}:${idx}`); // [ "remote_name:foo-*", "remote_name:bar-*"]
    }

    return index.split(',');
  }

  return index;
}
