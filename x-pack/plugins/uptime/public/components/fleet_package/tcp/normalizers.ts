/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TCPFields, ConfigKeys } from '../types';
import { Normalizer, commonNormalizers } from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultTCPSimpleFields, defaultTCPAdvancedFields } from '../contexts';

export type TCPNormalizerMap = Record<keyof TCPFields, Normalizer>;

export const tcpNormalizers: TCPNormalizerMap = {
  [ConfigKeys.HOSTS]: (fields) =>
    fields?.[ConfigKeys.HOSTS]?.value ?? defaultTCPSimpleFields[ConfigKeys.HOSTS],
  [ConfigKeys.PROXY_URL]: (fields) =>
    fields?.[ConfigKeys.PROXY_URL]?.value ?? defaultTCPAdvancedFields[ConfigKeys.PROXY_URL],
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: (fields) =>
    fields?.[ConfigKeys.PROXY_USE_LOCAL_RESOLVER]?.value ??
    defaultTCPAdvancedFields[ConfigKeys.PROXY_USE_LOCAL_RESOLVER],
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: (fields) =>
    fields?.[ConfigKeys.RESPONSE_RECEIVE_CHECK]?.value ??
    defaultTCPAdvancedFields[ConfigKeys.RESPONSE_RECEIVE_CHECK],
  [ConfigKeys.REQUEST_SEND_CHECK]: (fields) =>
    fields?.[ConfigKeys.REQUEST_SEND_CHECK]?.value ??
    defaultTCPAdvancedFields[ConfigKeys.REQUEST_SEND_CHECK],
  ...tlsNormalizers,
  ...commonNormalizers,
};
