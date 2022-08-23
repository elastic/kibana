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

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const [metricsDataView, setMetricsDataView] = useState<DataView>();
  const {
    services: { dataViews },
  } = useKibana<InfraClientStartDeps>();
  const loadDataView = useCallback(async () => {
    let view = (await dataViews.find(metricAlias, 1))[0];
    if (!view) {
      view = await dataViews.createAndSave({
        title: metricAlias,
        timeFieldName: '@timestamp',
      });
    }
    if (view.id) {
      setMetricsDataView(view);
    }
  }, [metricAlias, dataViews]);

  useEffect(() => {
    loadDataView();
  }, [metricAlias, loadDataView]);

  return {
    metricsDataView,
  };
};

export const MetricsDataView = createContainer(useDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
