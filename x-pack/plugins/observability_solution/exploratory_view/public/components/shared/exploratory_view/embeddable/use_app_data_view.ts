/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useLocalDataView } from './use_local_data_view';
import { ExploratoryEmbeddableProps, ExploratoryViewPublicPluginsStart } from '../../../..';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { AppDataType } from '../types';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views/observability_data_views';
import { SeriesUrl } from '../../../..';

export const useAppDataView = ({
  series,
  dataViewCache,
  seriesDataType,
  dataViewsService,
  dataTypesIndexPatterns,
}: {
  series: SeriesUrl;
  seriesDataType: AppDataType;
  dataViewCache: Record<string, DataView>;
  dataViewsService: ExploratoryViewPublicPluginsStart['dataViews'];
  dataTypesIndexPatterns: ExploratoryEmbeddableProps['dataTypesIndexPatterns'];
}) => {
  const [dataViews, setDataViews] = useState<DataViewState>({} as DataViewState);
  const { dataViewTitle } = useLocalDataView(seriesDataType, dataTypesIndexPatterns);

  const { loading } = useFetcher(async () => {
    if (dataViewTitle && !dataViews[seriesDataType]) {
      if (dataViewCache[dataViewTitle]) {
        setDataViews((prevState) => ({
          ...(prevState ?? {}),
          [seriesDataType]: dataViewCache[dataViewTitle],
        }));
      } else {
        const obsvIndexP = new ObservabilityDataViews(dataViewsService, true);
        const indPattern = await obsvIndexP.getDataView(seriesDataType, dataViewTitle);
        dataViewCache[dataViewTitle] = indPattern!;
        setDataViews((prevState) => ({ ...(prevState ?? {}), [seriesDataType]: indPattern }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewTitle, seriesDataType, JSON.stringify(series)]);

  return { dataViews, loading: loading && !dataViews[seriesDataType] };
};
