/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { gapSchema, findGapsParamsSchema } from '../schemas';

export type Gap = TypeOf<typeof gapSchema>;
export type FindGapsParams = TypeOf<typeof findGapsParamsSchema>;

export interface Interval {
  gte: Date;
  lte: Date;
}

export interface StringInterval {
  gte: string;
  lte: string;
}
