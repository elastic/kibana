/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CspClientPluginStartDeps } from '../../types';

/**
 * Hook to retrieve a Data View by it's Index Pattern title
 */
export const useDataView = (dataViewId: string) => {
  const {
    data: { dataViews },
    spaces,
  } = useKibana<CspClientPluginStartDeps>().services;
  return useQuery(['useDataView', dataViewId], async () => {
    const currentSpaceId = spaces ? (await spaces.getActiveSpace()).id : 'default';
    const dataViewIdCurrentSpace = `${dataViewId}-${currentSpaceId}`;
    const dataView = await dataViews.get(dataViewIdCurrentSpace);
    if (!dataView) {
      throw new Error(`Data view not found [${dataViewIdCurrentSpace}]`);
    }

    return dataView;
  });
};
