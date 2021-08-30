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
  getNormalizer,
  getJsonToArrayOrObjectNormalizer,
} from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultHTTPSimpleFields, defaultHTTPAdvancedFields } from '../contexts';

export type HTTPNormalizerMap = Record<keyof HTTPFields, Normalizer>;

const defaultHTTPValues = {
  ...defaultHTTPSimpleFields,
  ...defaultHTTPAdvancedFields,
};

export const getHTTPNormalizer = (key: ConfigKeys) => {
  return getNormalizer(key, defaultHTTPValues);
};

export const getHTTPJsonToArrayOrObjectNormalizer = (key: ConfigKeys) => {
  return getJsonToArrayOrObjectNormalizer(key, defaultHTTPValues);
};

export const httpNormalizers: HTTPNormalizerMap = {
  [ConfigKeys.URLS]: getHTTPNormalizer(ConfigKeys.URLS),
  [ConfigKeys.MAX_REDIRECTS]: getHTTPNormalizer(ConfigKeys.MAX_REDIRECTS),
  [ConfigKeys.USERNAME]: getHTTPNormalizer(ConfigKeys.USERNAME),
  [ConfigKeys.PASSWORD]: getHTTPNormalizer(ConfigKeys.PASSWORD),
  [ConfigKeys.PROXY_URL]: getHTTPNormalizer(ConfigKeys.PROXY_URL),
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: getHTTPJsonToArrayOrObjectNormalizer(
    ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE
  ),
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: getHTTPJsonToArrayOrObjectNormalizer(
    ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE
  ),
  [ConfigKeys.RESPONSE_BODY_INDEX]: getHTTPNormalizer(ConfigKeys.RESPONSE_BODY_INDEX),
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: getHTTPJsonToArrayOrObjectNormalizer(
    ConfigKeys.RESPONSE_HEADERS_CHECK
  ),
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: getHTTPNormalizer(ConfigKeys.RESPONSE_HEADERS_INDEX),
  [ConfigKeys.RESPONSE_STATUS_CHECK]: getHTTPJsonToArrayOrObjectNormalizer(
    ConfigKeys.RESPONSE_STATUS_CHECK
  ),
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
  [ConfigKeys.REQUEST_HEADERS_CHECK]: getHTTPJsonToArrayOrObjectNormalizer(
    ConfigKeys.REQUEST_HEADERS_CHECK
  ),
  [ConfigKeys.REQUEST_METHOD_CHECK]: getHTTPNormalizer(ConfigKeys.REQUEST_METHOD_CHECK),
  ...commonNormalizers,
  ...tlsNormalizers,
};
