/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';

export interface KbnServer extends Server {
  usage: any;
}

export const initServerWithKibana = (kbnServer: KbnServer) => {
  const libs = compose(kbnServer);
  initServer(libs);
};

export const getConfigSchema = (Joi: typeof JoiNamespace) => {
  const DefaultSourceConfigSchema = Joi.object({});

  const AppRootConfigSchema = Joi.object({
    enabled: Joi.boolean().default(true),
    query: Joi.object({
      partitionSize: Joi.number(),
      partitionFactor: Joi.number(),
    }).default(),
    sources: Joi.object()
      .keys({
        default: DefaultSourceConfigSchema,
      })
      .pattern(/.*/, DefaultSourceConfigSchema)
      .default(),
  }).default();

  return AppRootConfigSchema;
};
