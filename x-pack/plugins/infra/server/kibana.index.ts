/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { initInfraServer } from './infra_server';
import { compose } from './lib/compose/kibana';
import { UsageCollector } from './usage/usage_collector';

export interface KbnServer extends Server {
  usage: any;
}

export const initServerWithKibana = (kbnServer: KbnServer) => {
  const libs = compose(kbnServer);
  initInfraServer(libs);

  // Register a function with server to manage the collection of usage stats
  kbnServer.usage.collectorSet.register(UsageCollector.getUsageCollector(kbnServer));
};

export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const InfraDefaultSourceConfigSchema = Joi.object({
    metricAlias: Joi.string(),
    logAlias: Joi.string(),
    fields: Joi.object({
      container: Joi.string(),
      host: Joi.string(),
      pod: Joi.string(),
      tiebreaker: Joi.string(),
      timestamp: Joi.string(),
    }),
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
      .default(),
  }).default();

  return InfraRootConfigSchema;
};

export const getDeprecations = () => [];

// interface DeprecationHelpers {
//   rename(oldKey: string, newKey: string): (settings: unknown, log: unknown) => void;
//   unused(oldKey: string): (settings: unknown, log: unknown) => void;
// }
