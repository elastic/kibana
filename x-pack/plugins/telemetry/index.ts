/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { Root } from 'joi';

import { createTelemetryUsageCollector } from './telemetry_usage_collector';

export const telemetry = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.telemetry',
    id: 'telemetry',
    require: ['kibana'],
    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        usage: Joi.object().default(),
      }).default();
    },
    init(server: Server) {
      server.usage.collectorSet.register(createTelemetryUsageCollector(server));
    },
  });
