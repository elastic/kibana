/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString, { ParsedQuery } from 'query-string';

import { getAppSearchUrl } from '../../../shared/enterprise_search_url';
import { EngineLogic } from '../engine';

export const generatePreviewUrl = (query: ParsedQuery) => {
  const { engineName } = EngineLogic.values;
  return queryString.stringifyUrl(
    {
      query,
      url: getAppSearchUrl(`/engines/${engineName}/reference_application/preview`),
    },
    { arrayFormat: 'bracket', skipEmptyString: true }
  );
};
