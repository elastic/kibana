/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServices } from '../../../types';
import { IndexPatternSavedObject, IndexPatternSavedObjectAttributes } from '../types';

/**
 * Fetches Configured Index Patterns from the Kibana saved objects API
 *
 * TODO: Refactor to context provider: https://github.com/elastic/siem-team/issues/448
 */
export const getIndexPatterns = async (
  savedObjects: StartServices['savedObjects']
): Promise<IndexPatternSavedObject[]> => {
  const response = await savedObjects.client.find<IndexPatternSavedObjectAttributes>({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });

  return response.savedObjects;
};
