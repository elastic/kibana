/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { initInfraServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { UsageCollector } from './usage/usage_collector';
import { createLogger } from './utils/logger';

export interface KbnServer extends Server {
  usage: any;
}

export const initServerWithKibana = (kbnServer: KbnServer) => {
  const logger = createLogger(kbnServer);
  logger.info('Plugin initializing');

  const libs = compose(kbnServer);
  initInfraServer(libs, logger);
  // Register a function with server to manage the collection of usage stats
  kbnServer.usage.collectorSet.register(UsageCollector.getUsageCollector(kbnServer));
  logger.info('Plugin done initializing');
};

export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const InfraDefaultSourceConfigSchema = Joi.object({
    metricAlias: Joi.string(),
    logAlias: Joi.string(),
    fields: Joi.object({
      container: Joi.string(),
      host: Joi.string(),
      message: Joi.array()
        .items(Joi.string())
        .single(),
      pod: Joi.string(),
      tiebreaker: Joi.string(),
      timestamp: Joi.string(),
    }),
  });

  const InfraSourceConfigSchema = InfraDefaultSourceConfigSchema.keys({
    metricAlias: Joi.reach(InfraDefaultSourceConfigSchema, 'metricAlias').required(),
    logAlias: Joi.reach(InfraDefaultSourceConfigSchema, 'logAlias').required(),
  });

  const InfraRootConfigSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    query: Joi.object({
      partitionSize: Joi.number(),
      partitionFactor: Joi.number(),
    }).default(),
    sources: Joi.object()
      .keys({
        default: InfraDefaultSourceConfigSchema,
      })
      .pattern(/.*/, InfraSourceConfigSchema)
      .default(),
  }).default();

  return InfraRootConfigSchema;
};
