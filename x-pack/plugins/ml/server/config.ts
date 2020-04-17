/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { MlConfigType, configSchema } from '../common/types/ml_config';

export const config: PluginConfigDescriptor<MlConfigType> = {
  exposeToBrowser: {
    file_data_visualizer: true,
  },
  schema: configSchema,
};
