/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CommonFields,
  HTTPSimpleFields,
  HTTPAdvancedFields,
  BrowserSimpleFields,
  BrowserAdvancedFields,
  ConfigKey,
  DataStream,
  Mode,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  HTTPMethod,
} from '../runtime_types';

export const commonDefaultValues: CommonFields = {
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKey.LOCATIONS]: [],
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKey.APM_SERVICE_NAME]: '',
  [ConfigKey.TAGS]: [],
  [ConfigKey.TIMEOUT]: '16',
  [ConfigKey.NAME]: '',
  [ConfigKey.LOCATIONS]: [],
  [ConfigKey.NAMESPACE]: 'default',
  [ConfigKey.IS_ELASTIC_AGENT_MONITOR]: false,
};

export const httpSimpleFields: HTTPSimpleFields = {
  ...commonDefaultValues,
  [ConfigKey.METADATA]: {
    is_tls_enabled: false,
  },
  [ConfigKey.URLS]: '',
  [ConfigKey.MAX_REDIRECTS]: '0',
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
};

export const httpAdvancedFields: HTTPAdvancedFields = {
  [ConfigKey.PASSWORD]: '',
  [ConfigKey.PROXY_URL]: '',
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKey.RESPONSE_STATUS_CHECK]: [],
  [ConfigKey.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.PLAINTEXT,
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {},
  [ConfigKey.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKey.USERNAME]: '',
};

export const httpDefaultFields = {
  ...httpSimpleFields,
  ...httpAdvancedFields,
};

export const defaultConfig = {
  [DataStream.HTTP]: httpDefaultFields,
  [DataStream.TCP]: {},
  [DataStream.ICMP]: {},
  [DataStream.BROWSER]: {},
};
