/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ProcessorFields } from './format_synthetics_policy';
import { ConfigKey, HeartbeatFields, MonitorFields } from '../../../../common/runtime_types';

interface FieldProcessor {
  add_fields: {
    target: string;
    fields: HeartbeatFields;
  };
}

export const processorsFormatter = (config: MonitorFields & ProcessorFields) => {
  const labels = config[ConfigKey.LABELS] ?? {};
  const processors: FieldProcessor[] = [
    {
      add_fields: {
        fields: {
          'monitor.fleet_managed': true,
          config_id: config.config_id,
          test_run_id: config.test_run_id,
          run_once: config.run_once,
          'monitor.id': config['monitor.id'],
          'monitor.project.name': config['monitor.project.name'],
          'monitor.project.id': config['monitor.project.id'],
          meta: {
            space_id: config.space_id,
          },
          ...(isEmpty(labels) ? {} : { labels }),
        },
        target: '',
      },
    },
  ];

  return JSON.stringify(processors);
};
