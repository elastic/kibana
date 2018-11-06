/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiAction } from './api';
import { loadClusters as request } from '../../services/api';
import * as t from '../action_types';

export const loadClusters = () => apiAction({
  label: t.CLUSTERS_LOAD,
  handler: async () => {

    const data = await request();

    // We can manipulate any way we want the response
    return { ...data, isModified: true };
  }
});
