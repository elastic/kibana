/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchStartSearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { OnlySearchSourceRuleParams } from '../types';

export async function getInitialSearchSource(
  params: OnlySearchSourceRuleParams,
  searchSourceClient: ISearchStartSearchSource
) {
  const initialSearchSource = await searchSourceClient.create({
    ...params.searchConfiguration,
    fields: [
      ...((params.searchConfiguration as SerializedSearchSourceFields)?.fields || []),
      'index',
      'filter',
      'query',
    ],
  });
  return initialSearchSource;
}
