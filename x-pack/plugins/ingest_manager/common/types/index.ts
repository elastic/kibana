/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';

export * from './models';
export * from './rest_spec';
import { config } from '../constants';

export type IngestManagerConfigType = TypeOf<typeof config.schema>;
