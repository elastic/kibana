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
  const InfraSourceConfigSchema = Joi.object({
    metricAlias: Joi.string().default('xpack-infra-default-metrics'),
    logAlias: Joi.string().default('xpack-infra-default-logs'),
    fields: Joi.object({
      container: Joi.string().default('docker.container.name'),
      hostname: Joi.string().default('beat.hostname'),
      message: Joi.array()
        .items(Joi.string())
        .single()
        .default(['message', '@message']),
      pod: Joi.string().default('kubernetes.pod.name'),
      tiebreaker: Joi.string().default('_doc'),
      timestamp: Joi.string().default('@timestamp'),
    }).default(),
  }).default();

  const InfraRootConfigSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    query: Joi.object({
      partitionSize: Joi.number().default(75),
      partitionFactor: Joi.number().default(1.2),
    }).default(),
    sources: Joi.object()
      .keys({
        default: InfraSourceConfigSchema,
      })
      .pattern(/.*/, InfraSourceConfigSchema)
      .default(),
  }).default();

  return InfraRootConfigSchema;
};
