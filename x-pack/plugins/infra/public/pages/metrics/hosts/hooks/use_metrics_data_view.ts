/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { isDevMode } from '../../../../utils/dev_mode';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import {
  createDataViewNotificationChannel,
  createDataViewStateMachine,
} from '../machines/data_view_state';

export const useMetricsDataView = ({
  indexPattern,
  useDevTools = isDevMode(),
}: {
  indexPattern: string;
  useDevTools?: boolean;
}) => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const [dataViewStateNotifications] = useState(() => createDataViewNotificationChannel());

  const dataViewStateService = useInterpret(
    () =>
      createDataViewStateMachine({
        initialContext: {
          indexPattern,
        },
        dataViews,
        notificationChannel: dataViewStateNotifications,
      }),
    {
      devTools: useDevTools,
    }
  );

  const dataView = useSelector(dataViewStateService, (state) =>
    state.matches('dataViewLoaded') ? state.context.dataView : undefined
  );

  const isLoadingDataView = useSelector(dataViewStateService, (state) => state.matches('loading'));

  const latestLoadLogViewFailures = useSelector(dataViewStateService, (state) =>
    state.matches('loadingFailed') ? [state.context.error] : []
  );

  return {
    metricAlias: indexPattern,
    dataView,
    loading: isLoadingDataView,
    retry: () => {},
    error: latestLoadLogViewFailures[0],
    dataViewStateNotifications,
  };
};

export const MetricsDataView = createContainer(useMetricsDataView);
export const [MetricsDataViewProvider, useMetricsDataViewContext] = MetricsDataView;
