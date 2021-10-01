/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TCPFields, ConfigKeys } from '../types';
import { Normalizer, commonNormalizers, getNormalizer } from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultTCPSimpleFields, defaultTCPAdvancedFields } from '../contexts';

const defaultTCPFields = {
  ...defaultTCPSimpleFields,
  ...defaultTCPAdvancedFields,
};

export type TCPNormalizerMap = Record<keyof TCPFields, Normalizer>;

export const getTCPNormalizer = (key: ConfigKeys) => {
  return getNormalizer(key, defaultTCPFields);
};

export const tcpNormalizers: TCPNormalizerMap = {
  [ConfigKeys.HOSTS]: getTCPNormalizer(ConfigKeys.HOSTS),
  [ConfigKeys.PROXY_URL]: getTCPNormalizer(ConfigKeys.PROXY_URL),
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: getTCPNormalizer(ConfigKeys.PROXY_USE_LOCAL_RESOLVER),
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: getTCPNormalizer(ConfigKeys.RESPONSE_RECEIVE_CHECK),
  [ConfigKeys.REQUEST_SEND_CHECK]: getTCPNormalizer(ConfigKeys.REQUEST_SEND_CHECK),
  ...tlsNormalizers,
  ...commonNormalizers,
};
