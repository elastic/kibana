/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { MAX_BYTES } from '../constants/file_datavisualizer';

export const configSchema = schema.object({
  file_data_visualizer: schema.object({
    max_file_size_bytes: schema.number({ defaultValue: MAX_BYTES }),
  }),
});

export type MlConfigType = TypeOf<typeof configSchema>;
