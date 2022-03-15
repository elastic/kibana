/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '../../../../common/constants';
import { DataStream, MonitorFields } from '../../../../common/runtime_types';

interface DataStreamConfig {
  type: DataStream;
  id: string;
  schedule: string;
  enabled: boolean;
  data_stream: {
    namespace: 'default';
  };
  streams: [
    {
      data_stream: {
        dataset: DataStream;
        type: 'synthetics';
      };
    } & Partial<MonitorFields>
  ];
}

export function convertToDataStreamFormat(monitor: Record<string, any>): DataStreamConfig {
  return {
    type: monitor.type,
    id: monitor.id,
    // Schedule is needed by service at root level as well
    schedule: monitor.schedule,
    enabled: monitor.enabled ?? true,
    data_stream: {
      namespace: monitor.namespace ?? DEFAULT_NAMESPACE_STRING,
    },
    streams: [
      {
        data_stream: {
          dataset: monitor.type,
          type: 'synthetics',
        },
        ...monitor,
      },
    ],
  };
}
