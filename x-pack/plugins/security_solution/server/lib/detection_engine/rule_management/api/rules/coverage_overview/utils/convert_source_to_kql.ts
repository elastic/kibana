/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PARAMS_IMMUTABLE_FIELD = 'alert.attributes.params.immutable';

/**
 * Build a KQL to fetch either custom or prebuilt rules
 */
export function convertSourceToKQL(source: 'custom' | 'prebuilt'): string {
  return source === 'custom'
    ? `${PARAMS_IMMUTABLE_FIELD}: false`
    : `${PARAMS_IMMUTABLE_FIELD}: true`;
}
