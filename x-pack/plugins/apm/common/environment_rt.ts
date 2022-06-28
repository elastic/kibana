/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from './environment_filter_values';

export const environmentStringRt = t.union([
  t.literal(ENVIRONMENT_NOT_DEFINED.value),
  t.literal(ENVIRONMENT_ALL.value),
  nonEmptyStringRt,
]);

export const environmentRt = t.type({
  environment: environmentStringRt,
});

export type Environment = t.TypeOf<typeof environmentRt>['environment'];
