/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MlFieldFormatService, FieldFormatService } from './field_format_service';
import type { MlIndexUtils } from '../util/index_service';
import type { MlApi } from './ml_api_service';
import type { MlJobService } from './job_service';

export function fieldFormatServiceFactory(
  mlApi: MlApi,
  mlIndexUtils: MlIndexUtils,
  mlJobService: MlJobService
): MlFieldFormatService {
  return new FieldFormatService(mlApi, mlIndexUtils, mlJobService);
}
