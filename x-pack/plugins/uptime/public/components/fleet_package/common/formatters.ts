/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ICustomFields, ConfigKeys } from '../types';

export type Formatter = null | ((fields: Partial<ICustomFields>) => string | null);

type CommonFormatMap = Record<keyof ICommonFields, Formatter>;

export const commonFormatters: CommonFormatMap = {
  [ConfigKeys.MONITOR_TYPE]: null,
  [ConfigKeys.SCHEDULE]: (fields) =>
    JSON.stringify(
      `@every ${fields[ConfigKeys.SCHEDULE]?.number}${fields[ConfigKeys.SCHEDULE]?.unit}`
    ),
  [ConfigKeys.APM_SERVICE_NAME]: null,
  [ConfigKeys.TAGS]: (fields) => arrayToYamlFormatter(fields[ConfigKeys.TAGS]),
  [ConfigKeys.TIMEOUT]: (fields) => secondsToCronFormatter(fields[ConfigKeys.TIMEOUT]),
};

export const arrayToYamlFormatter = (value: string[] = []) =>
  value.length ? JSON.stringify(value) : null;

export const secondsToCronFormatter = (value: string = '') => (value ? `${value}s` : null);

export const objectToYamlFormtatter = (value: Record<string, string> = {}) =>
  Object.keys(value).length ? JSON.stringify(value) : null;

// switch (key) {
//   case ConfigKeys.SCHEDULE:
//     configItem.value = JSON.stringify(
//       `@every ${config[key]?.number}${config[key]?.unit}`
//     ); // convert to cron
//     break;
//   case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
//   case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
//   case ConfigKeys.RESPONSE_STATUS_CHECK:
//   case ConfigKeys.TAGS:
//     configItem.value = config[key]?.length ? JSON.stringify(config[key]) : null;
//     break;
//   case ConfigKeys.RESPONSE_HEADERS_CHECK:
//   case ConfigKeys.REQUEST_HEADERS_CHECK:
//     configItem.value = Object.keys(config?.[key] || []).length
//       ? JSON.stringify(config[key])
//       : null;
//     break;
//   case ConfigKeys.TIMEOUT:
//   case ConfigKeys.WAIT:
//     configItem.value = config[key] ? `${config[key]}s` : null; // convert to cron
//     break;
//   case ConfigKeys.REQUEST_BODY_CHECK:
//     configItem.value = config[key]?.value ? JSON.stringify(config[key]?.value) : null; // only need value of REQUEST_BODY_CHECK for outputted policy
//     break;
//   case ConfigKeys.TLS_CERTIFICATE:
//   case ConfigKeys.TLS_CERTIFICATE_AUTHORITIES:
//   case ConfigKeys.TLS_KEY:
//     configItem.value =
//       config[key]?.isEnabled && config[key]?.value
//         ? JSON.stringify(config[key]?.value)
//         : null; // only add tls settings if they are enabled by the user
//     break;
//   case ConfigKeys.TLS_VERSION:
//     configItem.value =
//       config[key]?.isEnabled && config[key]?.value.length
//         ? JSON.stringify(config[key]?.value)
//         : null; // only add tls settings if they are enabled by the user
//     break;
//   case ConfigKeys.TLS_KEY_PASSPHRASE:
//   case ConfigKeys.TLS_VERIFICATION_MODE:
//     configItem.value =
//       config[key]?.isEnabled && config[key]?.value ? config[key]?.value : null; // only add tls settings if they are enabled by the user
//     break;
//   default:
//     configItem.value =
//       config[key] === undefined || config[key] === null ? null : config[key];
