/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentConfig } from '@kbn/content-management-plugin/server';

import { MapsStorage } from './maps_storage';
import { contentSchemas } from './schemas';

export const getContentConfiguration = (): ContentConfig<MapsStorage> => {
  return {
    storage: new MapsStorage(),
    schemas: {
      content: contentSchemas,
    },
  };
};
