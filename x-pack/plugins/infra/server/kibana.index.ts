/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { initInfraServer } from './infra_server';
import { compose } from './lib/compose/kibana';

export const initServerWithKibana = (hapiServer: Server) => {
  const libs = compose(hapiServer);
  initInfraServer(libs);
};

export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const InfraDefaultSourceConfigSchema = Joi.object({
    metricAlias: Joi.string(),
    logAlias: Joi.string(),
    fields: Joi.object({
      container: Joi.string(),
      hostname: Joi.string(),
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
