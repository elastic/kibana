/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorFields } from './format_synthetics_policy';
import { MonitorFields } from '../../../../common/runtime_types';

type Fields = Record<string, string | boolean>;

interface FieldProcessor {
  add_fields: {
    target: string;
    fields: Fields;
  };
}

export const processorsFormatter = (config: Partial<MonitorFields & ProcessorFields>) => {
  const fields: Fields = {
    'monitor.fleet_managed': true,
  };
  if (config.test_run_id) {
    fields.test_run_id = config.test_run_id;
  }
  if (config.run_once) {
    fields.run_once = config.run_once;
  }
  if (config.config_id) {
    fields.config_id = config.config_id;
  }
  if (config['monitor.project.name']) {
    fields['monitor.project.name'] = config['monitor.project.name'];
  }
  if (config['monitor.project.id']) {
    fields['monitor.project.id'] = config['monitor.project.id'];
  }
  if (config['monitor.id']) {
    fields['monitor.id'] = config['monitor.id'];
  }
  const processors: FieldProcessor[] = [
    {
      add_fields: {
        fields,
        target: '',
      },
    },
  ];

  return JSON.stringify(processors);
};
