/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPFields, ConfigKey, ContentType, contentTypesToMode } from '../types';
import {
  Normalizer,
  commonNormalizers,
  getNormalizer,
  getJsonToJavascriptNormalizer,
} from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultHTTPSimpleFields, defaultHTTPAdvancedFields } from '../contexts';

export type HTTPNormalizerMap = Record<keyof HTTPFields, Normalizer>;

const defaultHTTPValues = {
  ...defaultHTTPSimpleFields,
  ...defaultHTTPAdvancedFields,
};

export const getHTTPNormalizer = (key: ConfigKey) => {
  return getNormalizer(key, defaultHTTPValues);
};

export const getHTTPJsonToJavascriptNormalizer = (key: ConfigKey) => {
  return getJsonToJavascriptNormalizer(key, defaultHTTPValues);
};

export const httpNormalizers: HTTPNormalizerMap = {
  [ConfigKey.METADATA]: getHTTPJsonToJavascriptNormalizer(ConfigKey.METADATA),
  [ConfigKey.URLS]: getHTTPNormalizer(ConfigKey.URLS),
  [ConfigKey.MAX_REDIRECTS]: getHTTPNormalizer(ConfigKey.MAX_REDIRECTS),
  [ConfigKey.USERNAME]: getHTTPNormalizer(ConfigKey.USERNAME),
  [ConfigKey.PASSWORD]: getHTTPNormalizer(ConfigKey.PASSWORD),
  [ConfigKey.PROXY_URL]: getHTTPNormalizer(ConfigKey.PROXY_URL),
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: getHTTPJsonToJavascriptNormalizer(
    ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE
  ),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: getHTTPJsonToJavascriptNormalizer(
    ConfigKey.RESPONSE_BODY_CHECK_POSITIVE
  ),
  [ConfigKey.RESPONSE_BODY_INDEX]: getHTTPNormalizer(ConfigKey.RESPONSE_BODY_INDEX),
  [ConfigKey.RESPONSE_HEADERS_CHECK]: getHTTPJsonToJavascriptNormalizer(
    ConfigKey.RESPONSE_HEADERS_CHECK
  ),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: getHTTPNormalizer(ConfigKey.RESPONSE_HEADERS_INDEX),
  [ConfigKey.RESPONSE_STATUS_CHECK]: getHTTPJsonToJavascriptNormalizer(
    ConfigKey.RESPONSE_STATUS_CHECK
  ),
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) => {
    const requestBody = fields?.[ConfigKey.REQUEST_BODY_CHECK]?.value;
    const requestHeaders = fields?.[ConfigKey.REQUEST_HEADERS_CHECK]?.value;
    if (requestBody) {
      const headers = requestHeaders
        ? JSON.parse(fields?.[ConfigKey.REQUEST_HEADERS_CHECK]?.value)
        : defaultHTTPAdvancedFields[ConfigKey.REQUEST_HEADERS_CHECK];
      const requestBodyValue =
        requestBody !== null && requestBody !== undefined
          ? JSON.parse(requestBody)
          : defaultHTTPAdvancedFields[ConfigKey.REQUEST_BODY_CHECK]?.value;
      let requestBodyType = defaultHTTPAdvancedFields[ConfigKey.REQUEST_BODY_CHECK]?.type;
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
      return defaultHTTPAdvancedFields[ConfigKey.REQUEST_BODY_CHECK];
    }
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: getHTTPJsonToJavascriptNormalizer(
    ConfigKey.REQUEST_HEADERS_CHECK
  ),
  [ConfigKey.REQUEST_METHOD_CHECK]: getHTTPNormalizer(ConfigKey.REQUEST_METHOD_CHECK),
  ...commonNormalizers,
  ...tlsNormalizers,
};
