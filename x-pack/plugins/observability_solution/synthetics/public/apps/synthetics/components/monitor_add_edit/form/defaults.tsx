/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatKibanaNamespace } from '../../../../../../common/formatters';
import { DEFAULT_FIELDS } from '../constants';

import {
  ConfigKey,
  MonitorTypeEnum,
  FormMonitorType,
  SyntheticsMonitor,
  BrowserFields,
  HTTPFields,
} from '../types';

export const getDefaultFormFields = (
  spaceId: string = 'default'
): Record<FormMonitorType, Record<string, any>> => {
  const kibanaNamespace = formatKibanaNamespace(spaceId);
  return {
    [FormMonitorType.MULTISTEP]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
      'source.inline': {
        type: 'recorder',
        script: '',
        fileName: '',
      },
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
      [ConfigKey.NAMESPACE]: kibanaNamespace,
    },
    [FormMonitorType.SINGLE]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
      [ConfigKey.NAMESPACE]: kibanaNamespace,
    },
    [FormMonitorType.HTTP]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.HTTP],
      isTLSEnabled: false,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
      [ConfigKey.NAMESPACE]: kibanaNamespace,
    },
    [FormMonitorType.TCP]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.TCP],
      isTLSEnabled: false,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
      [ConfigKey.NAMESPACE]: kibanaNamespace,
    },
    [FormMonitorType.ICMP]: {
      ...DEFAULT_FIELDS[MonitorTypeEnum.ICMP],
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
      [ConfigKey.NAMESPACE]: kibanaNamespace,
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
      monitorType === MonitorTypeEnum.BROWSER
        ? FormMonitorType.MULTISTEP
        : (monitorType as Omit<MonitorTypeEnum, MonitorTypeEnum.BROWSER> as FormMonitorType);
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
        isTLSEnabled: (monitor as HTTPFields)[ConfigKey.METADATA].is_tls_enabled,
      };
  }
};
