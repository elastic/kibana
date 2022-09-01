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

export const getDefaultFormFields = (
  spaceId: string = 'default'
): Record<FormMonitorType, Record<string, any>> => {
  return {
    [FormMonitorType.MULTISTEP]: {
      ...DEFAULT_FIELDS[DataStream.BROWSER],
      'source.inline': {
        type: 'recorder',
        script: '',
        fileName: '',
      },
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
      [ConfigKey.NAMESPACE]: spaceId,
    },
    [FormMonitorType.SINGLE]: {
      ...DEFAULT_FIELDS[DataStream.BROWSER],
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
      [ConfigKey.NAMESPACE]: spaceId,
    },
    [FormMonitorType.HTTP]: {
      ...DEFAULT_FIELDS[DataStream.HTTP],
      isTLSEnabled: false,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
      [ConfigKey.NAMESPACE]: spaceId,
    },
    [FormMonitorType.TCP]: {
      ...DEFAULT_FIELDS[DataStream.TCP],
      isTLSEnabled: false,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
      [ConfigKey.NAMESPACE]: spaceId,
    },
    [FormMonitorType.ICMP]: {
      ...DEFAULT_FIELDS[DataStream.ICMP],
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
      [ConfigKey.NAMESPACE]: spaceId,
    },
  };
};

export const formatDefaultFormValues = (monitor?: SyntheticsMonitor) => {
  if (!monitor) return undefined;

  let formMonitorType = monitor[ConfigKey.FORM_MONITOR_TYPE];
  const monitorType = monitor[ConfigKey.MONITOR_TYPE];
  const monitorWithFormMonitorType = {
    ...monitor,
  };

  // handle default monitor types from Uptime, which don't contain `ConfigKey.FORM_MONITOR_TYPE`
  if (!formMonitorType) {
    formMonitorType =
      monitorType === DataStream.BROWSER
        ? FormMonitorType.MULTISTEP
        : (monitorType as Omit<DataStream, DataStream.BROWSER> as FormMonitorType);
    monitorWithFormMonitorType[ConfigKey.FORM_MONITOR_TYPE] = formMonitorType;
  }

  switch (formMonitorType) {
    case FormMonitorType.MULTISTEP:
      const browserMonitor = monitor as BrowserFields;
      return {
        ...monitorWithFormMonitorType,
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
        ...monitorWithFormMonitorType,
      };
    case FormMonitorType.HTTP:
    case FormMonitorType.TCP:
      return {
        ...monitorWithFormMonitorType,
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
