/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Repository } from '../../common/types';

/**
 * Utility to remove empty fields ("") from repository settings
 */
export const cleanSettings = (settings: Repository['settings']) =>
  Object.entries(settings).reduce((acc: Repository['settings'], [key, value]) => {
    if (value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
