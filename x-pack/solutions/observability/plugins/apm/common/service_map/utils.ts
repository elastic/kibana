/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const invalidLicenseMessage = i18n.translate('xpack.apm.serviceMap.invalidLicenseMessage', {
  defaultMessage:
    "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data.",
});

const NONGROUPED_SPANS: Record<string, string[]> = {
  aws: ['servicename'],
  cache: ['all'],
  db: ['all'],
  external: ['graphql', 'grpc', 'websocket'],
  messaging: ['all'],
  template: ['handlebars'],
};

export function isSpanGroupingSupported(type?: string, subtype?: string) {
  if (!type || !(type in NONGROUPED_SPANS)) {
    return true;
  }
  return !NONGROUPED_SPANS[type].some(
    (nongroupedSubType) => nongroupedSubType === 'all' || nongroupedSubType === subtype
  );
}

export const SERVICE_MAP_TIMEOUT_ERROR = 'ServiceMapTimeoutError';
