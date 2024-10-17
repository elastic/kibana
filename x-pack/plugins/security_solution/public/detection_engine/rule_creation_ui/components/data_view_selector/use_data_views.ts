/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Fetches known Kibana data views from the Data View Service.
 *
 * `undefined` return value means data views are loading or an error happened.
 */
export function useDataViews(): DataViewListItem[] | undefined {
  const {
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const [dataViews, setDataViews] = useState<DataViewListItem[] | undefined>();

  useEffect(() => {
    (async () => setDataViews(await dataViewsService.getIdsWithTitle()))();
  }, [dataViewsService]);

  return dataViews;
}
