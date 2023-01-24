/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { ConfigKey, DataStream, FormMonitorType, MonitorFields } from '../types';
import { DEFAULT_FIELDS } from '../constants';

export const formatter = (fields: Record<string, any>) => {
  const monitorType = fields[ConfigKey.MONITOR_TYPE] as DataStream;
  const monitorFields: Record<string, any> = {};
  const defaults = DEFAULT_FIELDS[monitorType] as MonitorFields;
  Object.keys(defaults).map((key) => {
    /* split key names on dot to handle dot notation fields,
     * which are changed to nested fields by react-hook-form */
    monitorFields[key] = get(fields, key.split('.')) ?? defaults[key as ConfigKey];
  });
  return monitorFields as MonitorFields;
};

export const format = (fields: Record<string, unknown>) => {
  const formattedFields = formatter(fields) as MonitorFields;
  const formattedMap = {
    [FormMonitorType.SINGLE]: {
      ...formattedFields,
      [ConfigKey.SOURCE_INLINE]: `step('Go to ${formattedFields[ConfigKey.URLS]}', async () => {
          await page.goto('${formattedFields[ConfigKey.URLS]}');
          expect(await page.isVisible('text=${
            formattedFields[ConfigKey.TEXT_ASSERTION]
          }')).toBeTruthy();
        });`,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.SINGLE,
    },
    [FormMonitorType.MULTISTEP]: {
      ...formattedFields,
      [ConfigKey.METADATA]: {
        script_source: {
          is_generated_script: get(fields, 'source.inline.type') === 'recorder' ? true : false,
          file_name: get(fields, 'source.inline.fileName'),
        },
      },
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    },
    [FormMonitorType.HTTP]: {
      ...formattedFields,
      [ConfigKey.METADATA]: {
        is_tls_enabled: fields.isTLSEnabled,
      },
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
    },
    [FormMonitorType.TCP]: {
      ...formattedFields,
      [ConfigKey.METADATA]: {
        is_tls_enabled: fields.isTLSEnabled,
      },
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
    },
    [FormMonitorType.ICMP]: {
      ...formattedFields,
      [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
    },
  };
  return formattedMap[fields[ConfigKey.FORM_MONITOR_TYPE] as FormMonitorType];
};
