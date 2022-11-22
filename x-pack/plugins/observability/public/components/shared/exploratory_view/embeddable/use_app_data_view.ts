/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useLocalDataView } from './use_local_data_view';
import type { ExploratoryEmbeddableProps, ObservabilityPublicPluginsStart } from '../../../..';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { AppDataType } from '../types';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views/observability_data_views';

export const useAppDataView = ({
  dataViewCache,
  seriesDataType,
  dataViewsService,
  dataTypesIndexPatterns,
}: {
  seriesDataType: AppDataType;
  dataViewCache: Record<string, DataView>;
  dataViewsService: ObservabilityPublicPluginsStart['dataViews'];
  dataTypesIndexPatterns: ExploratoryEmbeddableProps['dataTypesIndexPatterns'];
}) => {
  const [dataViews, setDataViews] = useState<DataViewState>({} as DataViewState);
  const [loading, setLoading] = useState(false);

  const { dataViewTitle } = useLocalDataView(seriesDataType, dataTypesIndexPatterns);

  const loadIndexPattern = useCallback(
    async ({ dataType }: { dataType: AppDataType }) => {
      setLoading(true);
      try {
        if (dataViewTitle) {
          if (dataViewCache[dataViewTitle]) {
            setDataViews((prevState) => ({
              ...(prevState ?? {}),
              [dataType]: dataViewCache[dataViewTitle],
            }));
          } else {
            const obsvIndexP = new ObservabilityDataViews(dataViewsService, true);
            const indPattern = await obsvIndexP.getDataView(dataType, dataViewTitle);
            dataViewCache[dataViewTitle] = indPattern!;
            setDataViews((prevState) => ({ ...(prevState ?? {}), [dataType]: indPattern }));
          }

          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    },
    [dataViewCache, dataViewTitle, dataViewsService]
  );

  useEffect(() => {
    if (seriesDataType) {
      loadIndexPattern({ dataType: seriesDataType });
    }
  }, [seriesDataType, loadIndexPattern]);

  return { dataViews, loading };
};
