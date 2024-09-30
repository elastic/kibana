/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from '../../common';

export const testIntegration: Integration = {
  name: 'integration',
  title: 'Integration',
  description: 'Integration description',
  dataStreams: [
    {
      name: 'datastream',
      title: 'Datastream',
      description: 'Datastream description',
      inputTypes: ['filestream', 'tcp', 'udp'],
      docs: [
        {
          key: 'value',
          anotherKey: 'anotherValue',
        },
      ],
      rawSamples: ['{"test1": "test1"}'],
      pipeline: {
        processors: [
          {
            set: {
              field: 'ecs.version',
              value: '8.11.0',
            },
          },
          {
            rename: {
              field: 'message',
              target_field: 'event.original',
              ignore_missing: true,
              if: 'ctx.event?.original == null',
            },
          },
        ],
      },
      samplesFormat: { name: 'ndjson', multiline: false },
    },
  ],
};
