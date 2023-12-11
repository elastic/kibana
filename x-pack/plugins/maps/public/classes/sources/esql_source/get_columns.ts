/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { getIndexPatternService, getSearchService } from '../../../kibana_services';

export async function getColumns(esql: string) {
  const searchSource = await getSearchService().searchSource.create();
  const defaultDataView = await getIndexPatternService().getDefaultDataView();
  searchSource.setField('index', defaultDataView);
  searchSource.setField('query', { esql });

  const { rawResponse: resp } = await lastValueFrom(
    searchSource.fetch$({
      strategy: 'esql',
      disableWarningToasts: true,
    })
  );

  console.log('resp', resp);
}