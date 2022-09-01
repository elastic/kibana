/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import type { DataView } from '@kbn/data-views-plugin/public';
import { InfraClientStartDeps } from '../../../../types';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const [metricsDataView, setMetricsDataView] = useState<DataView>();
  const {
    services: { dataViews },
  } = useKibana<InfraClientStartDeps>();

  const [createDataViewRequest, createDataView] = useTrackedPromise(
    {
      createPromise: (config): Promise<DataView> => {
        return dataViews.createAndSave(config);
      },
      onResolve: (response: DataView) => {
        setMetricsDataView(response);
      },
      cancelPreviousOn: 'creation',
    },
    []
  );

  const [getDataViewRequest, getDataView] = useTrackedPromise(
    {
      createPromise: (indexPattern: string): Promise<DataView[]> => {
        return dataViews.find(metricAlias, 1);
      },
      onResolve: (response: DataView[]) => {
        setMetricsDataView(response[0]);
      },
      cancelPreviousOn: 'creation',
    },
    []
  );

  const loadDataView = useCallback(async () => {
    try {
      let view = (await getDataView(metricAlias))[0];
      if (!view) {
        view = await createDataView({
          title: metricAlias,
          timeFieldName: '@timestamp',
        });
      }
    } catch (error) {
      setMetricsDataView(undefined);
    }
  }, [metricAlias, createDataView, getDataView]);

  const hasFailedFetchingDataView = getDataViewRequest.state === 'rejected';
  const hasFailedCreatingDataView = createDataViewRequest.state === 'rejected';

  useEffect(() => {
    loadDataView();
  }, [metricAlias, loadDataView]);

  return {
    metricsDataView,
    hasFailedCreatingDataView,
    hasFailedFetchingDataView,
  };
};

export const MetricsDataView = createContainer(useDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
