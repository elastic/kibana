/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSentenceCase } from '@elastic/eui';
import { GlobalSearchProviderResult } from '@kbn/global-search-plugin/server';
import uuid from 'uuid';

export const mapToResults = (
  type: 'kibana' | 'search' | 'default',
  term: string,
  response: Response
): GlobalSearchProviderResult[] => {
  const isGenericSearch = type === 'default';
  const isKibanaDoc = type === 'kibana';
  return [
    {
      id: uuid.v4(),
      title: isGenericSearch
        ? `Elastic docs`
        : isKibanaDoc
        ? `${toSentenceCase(term)} docs`
        : `Search for "${term}" in the docs`,
      type: 'documentation',
      icon: 'documentation',
      url: response.url,
      score: isKibanaDoc ? 100 : 99,
    },
  ];
};
