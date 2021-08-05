/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPFields, ConfigKeys, ContentType, contentTypesToMode } from '../types';
import {
  Normalizer,
  commonNormalizers,
  yamlToArrayOrObjectNormalizer,
} from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultHTTPSimpleFields, defaultHTTPAdvancedFields } from '../contexts';

export type HTTPNormalizerMap = Record<keyof HTTPFields, Normalizer>;

export const httpNormalizers: HTTPNormalizerMap = {
  [ConfigKeys.URLS]: (fields) =>
    fields?.[ConfigKeys.URLS]?.value ?? defaultHTTPSimpleFields[ConfigKeys.URLS],
  [ConfigKeys.MAX_REDIRECTS]: (fields) =>
    fields?.[ConfigKeys.MAX_REDIRECTS]?.value ?? defaultHTTPSimpleFields[ConfigKeys.MAX_REDIRECTS],
  [ConfigKeys.USERNAME]: (fields) =>
    fields?.[ConfigKeys.USERNAME]?.value ?? defaultHTTPAdvancedFields[ConfigKeys.USERNAME],
  [ConfigKeys.PASSWORD]: (fields) =>
    fields?.[ConfigKeys.PASSWORD]?.value ?? defaultHTTPAdvancedFields[ConfigKeys.PASSWORD],
  [ConfigKeys.PROXY_URL]: (fields) =>
    fields?.[ConfigKeys.PROXY_URL]?.value ?? defaultHTTPAdvancedFields[ConfigKeys.PROXY_URL],
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]?.value) ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE],
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]?.value) ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE],
  [ConfigKeys.RESPONSE_BODY_INDEX]: (fields) =>
    fields?.[ConfigKeys.RESPONSE_BODY_INDEX]?.value ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_BODY_INDEX],
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.RESPONSE_HEADERS_CHECK]?.value) ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_HEADERS_CHECK],
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: (fields) =>
    fields?.[ConfigKeys.RESPONSE_HEADERS_INDEX]?.value ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_HEADERS_INDEX],
  [ConfigKeys.RESPONSE_STATUS_CHECK]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.RESPONSE_STATUS_CHECK]?.value) ??
    defaultHTTPAdvancedFields[ConfigKeys.RESPONSE_STATUS_CHECK],
  [ConfigKeys.REQUEST_BODY_CHECK]: (fields) => {
    const requestBody = fields?.[ConfigKeys.REQUEST_BODY_CHECK]?.value;
    const requestHeaders = fields?.[ConfigKeys.REQUEST_HEADERS_CHECK]?.value;
    if (requestBody) {
      const headers = requestHeaders
        ? JSON.parse(fields?.[ConfigKeys.REQUEST_HEADERS_CHECK]?.value)
        : defaultHTTPAdvancedFields[ConfigKeys.REQUEST_HEADERS_CHECK];
      const requestBodyValue =
        requestBody !== null && requestBody !== undefined
          ? JSON.parse(requestBody)
          : defaultHTTPAdvancedFields[ConfigKeys.REQUEST_BODY_CHECK]?.value;
      let requestBodyType = defaultHTTPAdvancedFields[ConfigKeys.REQUEST_BODY_CHECK]?.type;
      Object.keys(headers || []).some((headerKey) => {
        if (headerKey === 'Content-Type' && contentTypesToMode[headers[headerKey] as ContentType]) {
          requestBodyType = contentTypesToMode[headers[headerKey] as ContentType];
          return true;
        }
      });
      return {
        value: requestBodyValue,
        type: requestBodyType,
      };
    } else {
      return defaultHTTPAdvancedFields[ConfigKeys.REQUEST_BODY_CHECK];
    }
  },
  [ConfigKeys.REQUEST_HEADERS_CHECK]: (fields) =>
    yamlToArrayOrObjectNormalizer(fields?.[ConfigKeys.REQUEST_HEADERS_CHECK]?.value) ??
    defaultHTTPAdvancedFields[ConfigKeys.REQUEST_HEADERS_CHECK],
  [ConfigKeys.REQUEST_METHOD_CHECK]: (fields) =>
    fields?.[ConfigKeys.REQUEST_METHOD_CHECK]?.value ??
    defaultHTTPAdvancedFields[ConfigKeys.REQUEST_METHOD_CHECK],
  ...commonNormalizers,
  ...tlsNormalizers,
};
