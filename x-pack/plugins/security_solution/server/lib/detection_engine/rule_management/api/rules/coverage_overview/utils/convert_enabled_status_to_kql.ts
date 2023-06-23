/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ENABLED_FIELD = 'alert.attributes.enabled';

export function convertEnabledStatusToKQL(enabled: boolean): string {
  return `${ENABLED_FIELD}: ${enabled ? 'true' : 'false'}`;
}
