/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  UseFormReturn,
  ControllerRenderProps,
  ControllerFieldState,
  FormState,
} from 'react-hook-form';
import {
  ConfigKey,
  ServiceLocation,
  FormMonitorType,
  MonitorFields,
} from '../../../../../common/runtime_types/monitor_management';
import { AlertConfigKey } from './constants';

export type StepKey = 'step1' | 'step2' | 'step3' | 'scriptEdit';

export interface Step {
  title: string;
  children: React.ReactNode;
}

export type StepMap = Record<FormMonitorType, Step[]>;

export * from '../../../../../common/runtime_types/monitor_management';
export * from '../../../../../common/types/monitor_validation';

export interface FormLocation {
  id: string;
  isServiceManaged: boolean;
  label: string;
}
export type FormConfig = MonitorFields & {
  isTLSEnabled: boolean;
  ['schedule.number']: string;
  ['source.inline']: string;
  [AlertConfigKey.STATUS_ENABLED]: boolean;
  [ConfigKey.LOCATIONS]: FormLocation[];

  /* Dot notiation keys must have a type configuration both for their flattened and nested
   * variation in order for types to register for react hook form. For example, `AlertConfigKey.STATUS_ENABLED`
   * must be defined both as `alert.config.enabled: boolean` and `alert: { config: { enabled: boolean } }` */
  alert: {
    status: {
      enabled: boolean;
    };
  };
  ssl: {
    supported_protocols: MonitorFields[ConfigKey.TLS_VERSION];
  };
};

export interface FieldMeta<TFieldKey extends keyof FormConfig> {
  fieldKey: keyof FormConfig;
  component: React.ComponentType<any>;
  label?: string;
  ariaLabel?: string;
  helpText?: string | React.ReactNode;
  props?: (params: {
    field?: ControllerRenderProps<FormConfig, TFieldKey>;
    formState: FormState<FormConfig>;
    setValue: UseFormReturn<FormConfig>['setValue'];
    reset: UseFormReturn<FormConfig>['reset'];
    locations: Array<ServiceLocation & { key: string }>;
    dependencies: unknown[];
    dependenciesFieldMeta: Record<keyof FormConfig, ControllerFieldState>;
    space?: string;
    isEdit?: boolean;
  }) => Record<string, any>;
  controlled?: boolean;
  required?: boolean;
  shouldUseSetValue?: boolean;
  customHook?: (value: unknown) => {
    // custom hooks are only supported for controlled components and only supported for determining error validation
    func: Function;
    params: unknown;
    fieldKey: string;
    error: string;
  };
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  ) => void;
  showWhen?: [keyof FormConfig, any]; // show field when another field equals an arbitrary value
  validation?: (dependencies: unknown[]) => Parameters<UseFormReturn['register']>[1];
  error?: React.ReactNode;
  dependencies?: Array<keyof FormConfig>; // fields that another field may depend for or validation. Values are passed to the validation function
}

export interface FieldMap {
  [ConfigKey.FORM_MONITOR_TYPE]: FieldMeta<ConfigKey.FORM_MONITOR_TYPE>;
  [`urls__single`]: FieldMeta<ConfigKey.URLS>;
  [`urls__http`]: FieldMeta<ConfigKey.URLS>;
  [`hosts__tcp`]: FieldMeta<ConfigKey.HOSTS>;
  [`hosts__icmp`]: FieldMeta<ConfigKey.HOSTS>;
  [ConfigKey.NAME]: FieldMeta<ConfigKey.NAME>;
  ['schedule.number']: FieldMeta<ConfigKey.SCHEDULE>;
  [ConfigKey.TAGS]: FieldMeta<ConfigKey.TAGS>;
  [ConfigKey.TIMEOUT]: FieldMeta<ConfigKey.TIMEOUT>;
  [ConfigKey.APM_SERVICE_NAME]: FieldMeta<ConfigKey.APM_SERVICE_NAME>;
  [ConfigKey.LOCATIONS]: FieldMeta<ConfigKey.LOCATIONS>;
  ['isTLSEnabled']: FieldMeta<'isTLSEnabled'>;
  [ConfigKey.TLS_VERSION]: FieldMeta<ConfigKey.TLS_VERSION>;
  [ConfigKey.TLS_VERIFICATION_MODE]: FieldMeta<ConfigKey.TLS_VERIFICATION_MODE>;
  [ConfigKey.TLS_CERTIFICATE]: FieldMeta<ConfigKey.TLS_CERTIFICATE>;
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: FieldMeta<ConfigKey.TLS_CERTIFICATE_AUTHORITIES>;
  [ConfigKey.TLS_KEY]: FieldMeta<ConfigKey.TLS_KEY>;
  [ConfigKey.TLS_KEY_PASSPHRASE]: FieldMeta<ConfigKey.TLS_KEY_PASSPHRASE>;
  [ConfigKey.SCREENSHOTS]: FieldMeta<ConfigKey.SCREENSHOTS>;
  [ConfigKey.ENABLED]: FieldMeta<ConfigKey.ENABLED>;
  [AlertConfigKey.STATUS_ENABLED]: FieldMeta<AlertConfigKey.STATUS_ENABLED>;
  [ConfigKey.NAMESPACE]: FieldMeta<ConfigKey.NAMESPACE>;
  [ConfigKey.TIMEOUT]: FieldMeta<ConfigKey.TIMEOUT>;
  [ConfigKey.MAX_REDIRECTS]: FieldMeta<ConfigKey.MAX_REDIRECTS>;
  [ConfigKey.WAIT]: FieldMeta<ConfigKey.WAIT>;
  [ConfigKey.USERNAME]: FieldMeta<ConfigKey.USERNAME>;
  [ConfigKey.PASSWORD]: FieldMeta<ConfigKey.PASSWORD>;
  [ConfigKey.PROXY_URL]: FieldMeta<ConfigKey.PROXY_URL>;
  ['proxy_url__tcp']: FieldMeta<ConfigKey.PROXY_URL>;
  [ConfigKey.REQUEST_METHOD_CHECK]: FieldMeta<ConfigKey.REQUEST_METHOD_CHECK>;
  [ConfigKey.REQUEST_HEADERS_CHECK]: FieldMeta<ConfigKey.REQUEST_HEADERS_CHECK>;
  [ConfigKey.REQUEST_BODY_CHECK]: FieldMeta<ConfigKey.REQUEST_BODY_CHECK>;
  [ConfigKey.RESPONSE_HEADERS_INDEX]: FieldMeta<ConfigKey.RESPONSE_HEADERS_INDEX>;
  [ConfigKey.RESPONSE_BODY_INDEX]: FieldMeta<ConfigKey.RESPONSE_BODY_INDEX>;
  [ConfigKey.RESPONSE_STATUS_CHECK]: FieldMeta<ConfigKey.RESPONSE_STATUS_CHECK>;
  [ConfigKey.RESPONSE_HEADERS_CHECK]: FieldMeta<ConfigKey.RESPONSE_HEADERS_CHECK>;
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: FieldMeta<ConfigKey.RESPONSE_BODY_CHECK_POSITIVE>;
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: FieldMeta<ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE>;
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: FieldMeta<ConfigKey.RESPONSE_RECEIVE_CHECK>;
  [ConfigKey.REQUEST_SEND_CHECK]: FieldMeta<ConfigKey.REQUEST_SEND_CHECK>;
  ['source.inline']: FieldMeta<ConfigKey.SOURCE_INLINE>;
  [ConfigKey.TEXT_ASSERTION]: FieldMeta<ConfigKey.TEXT_ASSERTION>;
  [ConfigKey.THROTTLING_CONFIG]: FieldMeta<ConfigKey.THROTTLING_CONFIG>;
  [ConfigKey.PARAMS]: FieldMeta<ConfigKey.PARAMS>;
  [ConfigKey.PLAYWRIGHT_OPTIONS]: FieldMeta<ConfigKey.PLAYWRIGHT_OPTIONS>;
  [ConfigKey.SYNTHETICS_ARGS]: FieldMeta<ConfigKey.SYNTHETICS_ARGS>;
  [ConfigKey.IGNORE_HTTPS_ERRORS]: FieldMeta<ConfigKey.IGNORE_HTTPS_ERRORS>;
}
