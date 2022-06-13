/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import { DEFAULT_FIELDS, DEFAULT_TLS_FIELDS } from '../constants';
import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  SyntheticsMonitor,
  BrowserFields,
  TLSFields,
} from '../types';

export const DEFAULT_FORM_FIELDS: Record<FormMonitorType, Record<string, any>> = {
  [FormMonitorType.MULTISTEP]: {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    'source.inline': {
      type: 'recorder',
      script: '',
      fileName: '',
    },
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  },
  [FormMonitorType.SINGLE]: {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
  },
  [FormMonitorType.HTTP]: {
    ...DEFAULT_FIELDS[DataStream.HTTP],
    isTLSEnabled: false,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
  },
  [FormMonitorType.TCP]: {
    ...DEFAULT_FIELDS[DataStream.TCP],
    isTLSEnabled: false,
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
  },
  [FormMonitorType.ICMP]: {
    ...DEFAULT_FIELDS[DataStream.ICMP],
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
  },
};

export const formatDefaultFormValues = (monitor?: SyntheticsMonitor) => {
  if (!monitor) return undefined;

  const monitorType = monitor[ConfigKey.FORM_MONITOR_TYPE];

  switch (monitorType) {
    case FormMonitorType.MULTISTEP:
      const browserMonitor = monitor as BrowserFields;
      return {
        ...monitor,
        'source.inline': {
          type: browserMonitor[ConfigKey.METADATA]?.script_source?.is_generated_script
            ? 'recorder'
            : 'inline',
          script: browserMonitor[ConfigKey.SOURCE_INLINE],
          fileName: browserMonitor[ConfigKey.METADATA]?.script_source?.file_name,
        },
      };
    case FormMonitorType.SINGLE:
    case FormMonitorType.ICMP:
      return {
        ...monitor,
      };
    case FormMonitorType.HTTP:
      return {
        ...monitor,
        isTLSEnabled: isCustomTLSEnabled(monitor),
      };
    case FormMonitorType.TCP:
      return {
        ...monitor,
        isTLSEnabled: isCustomTLSEnabled(monitor),
      };
  }
};

const isCustomTLSEnabled = (monitor: SyntheticsMonitor) => {
  const sslKeys = Object.keys(monitor).filter((key) => key.includes('ssl')) as unknown as Array<
    keyof TLSFields
  >;
  const sslValues: Record<string, unknown> = {};
  sslKeys.map((key) => (sslValues[key] = (monitor as TLSFields)[key]));
  return !isEqual(sslValues, DEFAULT_TLS_FIELDS);
};
