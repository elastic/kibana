/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { datatableVisualizationStateSchema } from './visualization_state/data_table';
import { getLensAttributesSchema, lensGenericAttributesSchema } from './common';

export const getSchema = () =>
  schema.object({
    attributes: schema.oneOf([
      getLensAttributesSchema('lnsDatatable', datatableVisualizationStateSchema),
      // lensGenericAttributesSchema,
    ]),
  });
