/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { PngCore } from '../common/generate_png';
export type {
  JobParamsPNGDeprecated,
  TaskPayloadPNG,
} from '../../../common/types/export_types/png';

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: PngCore,
  logger: Logger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (reporting: PngCore, logger: Logger) => RunTaskFnType;
