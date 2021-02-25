/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_JOB_FIELD_TYPES } from '../constants/field_types';

export type MlJobFieldType = typeof ML_JOB_FIELD_TYPES[keyof typeof ML_JOB_FIELD_TYPES];
