/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICommonFields, ConfigKeys } from '../types';
import { NewPackagePolicyInput } from '../../../../../fleet/common';
import { defaultValues } from './default_values';

// TO DO: create a standard input format that all fields resolve to
export type Normalizer = (fields: NewPackagePolicyInput['vars']) => unknown;

// create a type of all the common policy fields, as well as the fleet managed 'name' field
export type CommonNormalizerMap = Record<keyof ICommonFields | ConfigKeys.NAME, Normalizer>;

export const commonNormalizers: CommonNormalizerMap = {
  [ConfigKeys.NAME]: (fields) => fields?.[ConfigKeys.NAME]?.value ?? '',
  [ConfigKeys.MONITOR_TYPE]: (fields) =>
    fields?.[ConfigKeys.MONITOR_TYPE]?.value ?? defaultValues[ConfigKeys.MONITOR_TYPE],
  [ConfigKeys.SCHEDULE]: (fields) => {
    const value = fields?.[ConfigKeys.SCHEDULE]?.value;
    if (value) {
      const fullString = JSON.parse(fields?.[ConfigKeys.SCHEDULE]?.value);
      const fullSchedule = fullString.replace('@every ', '');
      const unit = fullSchedule.slice(-1);
      const number = fullSchedule.slice(0, fullSchedule.length - 1);
      return {
        unit,
        number,
      };
    } else {
      return defaultValues[ConfigKeys.SCHEDULE];
    }
  },
  [ConfigKeys.APM_SERVICE_NAME]: (fields) =>
    fields?.[ConfigKeys.APM_SERVICE_NAME]?.value ?? defaultValues[ConfigKeys.APM_SERVICE_NAME],
  [ConfigKeys.TAGS]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.TAGS]?.value) ??
    defaultValues[ConfigKeys.TAGS],
  [ConfigKeys.TIMEOUT]: (fields) =>
    cronToSecondsNormalizer(fields?.[ConfigKeys.TIMEOUT]?.value) ??
    defaultValues[ConfigKeys.TIMEOUT],
};

export const cronToSecondsNormalizer = (value: string) =>
  value ? value.slice(0, value.length - 1) : null;

export const yamlToArrayOrObjectNormalizer = (value: string) => (value ? JSON.parse(value) : null);

//   switch (key) {
//     case ConfigKeys.NAME:
//       acc[key] = currentPolicy.name;
//       break;
//     case ConfigKeys.SCHEDULE:
//       // split unit and number
//       if (value) {
//         const fullString = JSON.parse(value);
//         const fullSchedule = fullString.replace('@every ', '');
//         const unit = fullSchedule.slice(-1);
//         const number = fullSchedule.slice(0, fullSchedule.length - 1);
//         acc[key] = {
//           unit,
//           number,
//         };
//       } else {
//         acc[key] = fallbackConfigForMonitorType[key];
//       }
//       break;
//     case ConfigKeys.TIMEOUT:
//     case ConfigKeys.WAIT:
//       acc[key] = value
//         ? value.slice(0, value.length - 1)
//         : fallbackConfigForMonitorType[key]; // remove unit
//       break;
//     case ConfigKeys.TAGS:
//     case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
//     case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
//     case ConfigKeys.RESPONSE_STATUS_CHECK:
//     case ConfigKeys.RESPONSE_HEADERS_CHECK:
//     case ConfigKeys.REQUEST_HEADERS_CHECK:
//       acc[key] = value ? JSON.parse(value) : fallbackConfigForMonitorType[key];
//       break;
//     case ConfigKeys.REQUEST_BODY_CHECK:
//       const headers = value
//         ? JSON.parse(vars?.[ConfigKeys.REQUEST_HEADERS_CHECK].value)
//         : fallbackConfigForMonitorType[ConfigKeys.REQUEST_HEADERS_CHECK];
//       const requestBodyValue =
//         value !== null && value !== undefined
//           ? JSON.parse(value)
//           : fallbackConfigForMonitorType[key]?.value;
//       let requestBodyType = fallbackConfigForMonitorType[key]?.type;
//       Object.keys(headers || []).some((headerKey) => {
//         if (
//           headerKey === 'Content-Type' &&
//           contentTypesToMode[headers[headerKey] as ContentType]
//         ) {
//           requestBodyType = contentTypesToMode[headers[headerKey] as ContentType];
//           return true;
//         }
//       });
//       acc[key] = {
//         value: requestBodyValue,
//         type: requestBodyType,
//       };
//       break;
//     case ConfigKeys.TLS_KEY_PASSPHRASE:
//     case ConfigKeys.TLS_VERIFICATION_MODE:
//       acc[key] = {
//         value: value ?? fallbackConfigForMonitorType[key]?.value,
//         isEnabled: !!value,
//       };
//       if (!!value) {
//         enableTLS = true;
//       }
//       break;
//     case ConfigKeys.TLS_CERTIFICATE:
//     case ConfigKeys.TLS_CERTIFICATE_AUTHORITIES:
//     case ConfigKeys.TLS_KEY:
//     case ConfigKeys.TLS_VERSION:
//       acc[key] = {
//         value: value ? JSON.parse(value) : fallbackConfigForMonitorType[key]?.value,
//         isEnabled: !!value,
//       };
//       if (!!value) {
//         enableTLS = true;
//       }
//       break;
//     default:
//       acc[key] = value ?? fallbackConfigForMonitorType[key];
//   }
