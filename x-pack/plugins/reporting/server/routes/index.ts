/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import { ReportingCore } from '..';
import { LevelLogger } from '../lib';
import { registerDeprecationsRoutes } from './deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import {
  registerGenerateCsvFromSavedObjectImmediate,
  registerGenerateFromSavedObject,
  registerJobGenerationRoutes,
  registerLegacy,
} from './generate';
import { registerJobInfoRoutes } from './management';

export function registerRoutes(reporting: ReportingCore, logger: LevelLogger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
  registerGenerateFromSavedObject(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerLegacy(reporting, logger);
  registerJobInfoRoutes(reporting);
}

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = Boom.isBoom(error) ? error : Boom.boomify(error, { statusCode: error.statusCode });
  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
}
