/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPFields, ConfigKeys } from '../types';
import {
  Formatter,
  commonFormatters,
  objectToYamlFormtatter,
  arrayToYamlFormatter,
} from '../common/formatters';
import { tlsFormatters } from '../tls/formatters';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

export const httpFormatters: HTTPFormatMap = {
  [ConfigKeys.URLS]: null,
  [ConfigKeys.MAX_REDIRECTS]: null,
  [ConfigKeys.USERNAME]: null,
  [ConfigKeys.PASSWORD]: null,
  [ConfigKeys.PROXY_URL]: null,
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: (fields) =>
    arrayToYamlFormatter(fields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]),
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: (fields) =>
    arrayToYamlFormatter(fields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]),
  [ConfigKeys.RESPONSE_BODY_INDEX]: null,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: (fields) =>
    objectToYamlFormtatter(fields[ConfigKeys.RESPONSE_HEADERS_CHECK]),
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKeys.RESPONSE_STATUS_CHECK]: (fields) =>
    arrayToYamlFormatter(fields[ConfigKeys.RESPONSE_STATUS_CHECK]),
  [ConfigKeys.REQUEST_BODY_CHECK]: (fields) =>
    fields[ConfigKeys.REQUEST_BODY_CHECK]?.value
      ? JSON.stringify(fields[ConfigKeys.REQUEST_BODY_CHECK]?.value)
      : null,
  [ConfigKeys.REQUEST_HEADERS_CHECK]: (fields) =>
    objectToYamlFormtatter(fields[ConfigKeys.REQUEST_HEADERS_CHECK]),
  [ConfigKeys.REQUEST_METHOD_CHECK]: null,
  ...tlsFormatters,
  ...commonFormatters,
};

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
