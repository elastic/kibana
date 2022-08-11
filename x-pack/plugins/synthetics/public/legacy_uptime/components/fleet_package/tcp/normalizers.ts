/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TCPFields, ConfigKey } from '../types';
import {
  Normalizer,
  commonNormalizers,
  getNormalizer,
  getJsonToJavascriptNormalizer,
} from '../common/normalizers';
import { tlsNormalizers } from '../tls/normalizers';
import { defaultTCPSimpleFields, defaultTCPAdvancedFields } from '../contexts';

const defaultTCPFields = {
  ...defaultTCPSimpleFields,
  ...defaultTCPAdvancedFields,
};

export type TCPNormalizerMap = Record<keyof TCPFields, Normalizer>;

export const getTCPNormalizer = (key: ConfigKey) => {
  return getNormalizer(key, defaultTCPFields);
};

export const getTCPJsonToJavascriptNormalizer = (key: ConfigKey) => {
  return getJsonToJavascriptNormalizer(key, defaultTCPFields);
};

export const tcpNormalizers: TCPNormalizerMap = {
  [ConfigKey.METADATA]: getTCPJsonToJavascriptNormalizer(ConfigKey.METADATA),
  [ConfigKey.HOSTS]: getTCPNormalizer(ConfigKey.HOSTS),
  [ConfigKey.PROXY_URL]: getTCPNormalizer(ConfigKey.PROXY_URL),
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: getTCPNormalizer(ConfigKey.PROXY_USE_LOCAL_RESOLVER),
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: getTCPNormalizer(ConfigKey.RESPONSE_RECEIVE_CHECK),
  [ConfigKey.REQUEST_SEND_CHECK]: getTCPNormalizer(ConfigKey.REQUEST_SEND_CHECK),
  ...tlsNormalizers,
  ...commonNormalizers,
};
