/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/**
 * The parameter name that we use to read/write state to the query string
 */
export function parameterName(resolverComponentInstanceID: string): string {
  return `resolver-${resolverComponentInstanceID}`;
}
