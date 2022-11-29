/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalSearchProviderResult } from '@kbn/global-search-plugin/server';
import uuid from 'uuid';

export const mapToResults = (term: string, response: Response): GlobalSearchProviderResult[] => {
  return [
    {
      id: uuid.v4(),
      title: `Search for "${term}" in the docs`,
      type: 'documentation',
      icon: 'document',
      url: response.url,
      score: 100,
    },
  ];
};
