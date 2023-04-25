/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v5 as uuidv5 } from 'uuid';
import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';
import type { InfraClientStartDeps } from '../../../../types';
import { DATA_VIEW_PREFIX, TIMESTAMP_FIELD } from '../constants';

export const generateDataViewId = (indexPattern: string) => {
  // generates a unique but the same uuid as long as the index pattern doesn't change
  return `${DATA_VIEW_PREFIX}_${uuidv5(indexPattern, uuidv5.DNS)}`;
};

export const useDataView = ({ metricAlias }: { metricAlias: string }) => {
  const {
    services: { dataViews, notifications },
  } = useKibana<InfraClientStartDeps>();

  const [dataView, setDataView] = useState<DataView>();
  const [hasError, setHasError] = useState<boolean>(false);

  const [createAdhocDataViewRequest, createAdhocDataView] = useTrackedPromise(
    {
      createPromise: (config: DataViewSpec): Promise<DataView> => {
        return dataViews.create(config);
      },
      onResolve: (response: DataView) => {
        setDataView(response);
        setHasError(false);
      },
      onReject: () => {
        setHasError(true);
      },
      cancelPreviousOn: 'creation',
    },
    []
  );

  const loading = useMemo(
    () =>
      createAdhocDataViewRequest.state === 'pending' ||
      createAdhocDataViewRequest.state === 'uninitialized',
    [createAdhocDataViewRequest.state]
  );

  useEffect(() => {
    createAdhocDataView({
      id: generateDataViewId(metricAlias),
      title: metricAlias,
      timeFieldName: TIMESTAMP_FIELD,
    });
  }, [createAdhocDataView, metricAlias]);

  useEffect(() => {
    if (hasError && notifications) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataview', {
          defaultMessage: 'There was an error trying to create a Data View: {metricAlias}',
          values: { metricAlias },
        })
      );
    }
  }, [hasError, notifications, metricAlias]);

  return {
    metricAlias,
    dataView,
    loading,
    hasError,
  };
};

export const MetricsDataView = createContainer(useDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
