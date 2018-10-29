/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import JoiNamespace from 'joi';

import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { createLogger } from './utils/logger';

const APP_ID = 'secops';

export interface KbnServer extends Server {
  usage: unknown;
}

export const amMocking = (): boolean => process.env.INGEST_MOCKS === 'true';

export const initServerWithKibana = (kbnServer: KbnServer) => {
  const logger = createLogger(kbnServer.log.bind(kbnServer));
  logger.info('Plugin initializing');

  const mocking = amMocking();
  if (mocking) {
    logger.info(
      `Mocks for ${APP_ID} is activated. No real ${APP_ID} data will be used, only mocks will be used.`
    );
  }

  const libs = compose(kbnServer);
  initServer(libs, { mocking, logger });

  logger.info('Plugin done initializing');
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
