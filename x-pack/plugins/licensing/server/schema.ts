/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema as Schema } from '@kbn/config-schema';
import { DEFAULT_POLLING_FREQUENCY } from './constants';

export const schema = Schema.object({
  isEnabled: Schema.boolean({ defaultValue: true }),
  clusterSource: Schema.string({ defaultValue: 'data' }),
  pollingFrequency: Schema.number({ defaultValue: DEFAULT_POLLING_FREQUENCY }),
});
