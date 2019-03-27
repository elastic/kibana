/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Repository } from '../../common/types';

/**
 * Utility to coerce ES boolean strings to actual booleans
 */
export const booleanizeSettings = (repository: Repository) => {
  const { settings } = repository;

  if (!settings) {
    return repository;
  }

  return {
    ...repository,
    settings: Object.entries(settings).reduce((acc: Repository['settings'], [key, value]) => {
      if (value === 'true') {
        acc[key] = true;
      } else if (value === 'false') {
        acc[key] = false;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {}),
  };
};
