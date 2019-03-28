/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { values } from 'lodash';
import { MetricsExplorerAggregation } from './types';

export const metricsExplorerSchema = Joi.object({
  limit: Joi.number()
    .min(1)
    .default(9),
  afterKey: Joi.string(),
  groupBy: Joi.string(),
  indexPattern: Joi.string().required(),
  metrics: Joi.array()
    .items(
      Joi.object().keys({
        aggregation: Joi.string()
          .valid(values(MetricsExplorerAggregation))
          .required(),
        field: Joi.string(),
        rate: Joi.bool().default(false),
      })
    )
    .required(),
  timerange: Joi.object()
    .keys({
      field: Joi.string().required(),
      from: Joi.number().required(),
      to: Joi.number().required(),
      interval: Joi.string().required(),
    })
    .required(),
});
