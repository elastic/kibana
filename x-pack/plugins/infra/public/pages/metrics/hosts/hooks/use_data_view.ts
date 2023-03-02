/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v5 as uuidv5 } from 'uuid';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import useAsync from 'react-use/lib/useAsync';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';
import type { InfraClientStartDeps } from '../../../../types';
import { DATA_VIEW_PREFIX, TIMESTAMP_FIELD } from '../constants';

const generateDataViewId = (indexPattern: string) => {
  //
  return `${DATA_VIEW_PREFIX}_${uuidv5(indexPattern, uuidv5.DNS)}`;
};

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const {
    services: { dataViews, notifications },
  } = useKibana<InfraClientStartDeps>();

  const [_, createAdhocDataView] = useTrackedPromise(
    {
      createPromise: (config: DataViewSpec): Promise<DataView> => {
        return dataViews.create(config, false);
      },
      onResolve: (response: DataView) => {
        return response;
      },
      cancelPreviousOn: 'creation',
    },
    []
  );

  const { value, loading, error } = useAsync(
    () =>
      createAdhocDataView({
        id: generateDataViewId(metricAlias),
        title: metricAlias,
        timeFieldName: TIMESTAMP_FIELD,
      }),

    []
  );

  useEffect(() => {
    if (error && notifications) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataview', {
          defaultMessage: 'There was an error trying to create the Data View: {metricAlias}',
          values: { metricAlias },
        })
      );
    }
  }, [error, notifications, metricAlias]);

  return {
    dataView: value,
    loading,
    error,
  };
};

export const MetricsDataView = createContainer(useDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
