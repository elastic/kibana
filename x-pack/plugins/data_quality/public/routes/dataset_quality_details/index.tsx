/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory } from 'react-router-dom';
import React from 'react';
import type { DatasetQualityDetailsController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { PLUGIN_NAME } from '../../../common';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { DatasetQualityDetailsContextProvider, useDatasetQualityDetailsContext } from './context';

export const DatasetQualityDetailsRoute = () => {
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const {
    services: { chrome, datasetQuality, notifications, appParams },
  } = useKibanaContextForPlugin();

  useBreadcrumbs(PLUGIN_NAME, appParams, chrome);

  return (
    <DatasetQualityDetailsContextProvider
      datasetQuality={datasetQuality}
      urlStateStorageContainer={urlStateStorageContainer}
      toastsService={notifications.toasts}
    >
      <ConnectedContent />
    </DatasetQualityDetailsContextProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const history = useHistory();
  const { controller } = useDatasetQualityDetailsContext();

  if (!controller) {
    history.push('/');
    return null;
  }

  return <InitializedContent datasetQualityDetailsController={controller} />;
});

const InitializedContent = React.memo(
  ({
    datasetQualityDetailsController,
  }: {
    datasetQualityDetailsController: DatasetQualityDetailsController;
  }) => {
    const {
      services: { datasetQuality },
    } = useKibanaContextForPlugin();

    return <datasetQuality.DatasetQualityDetails controller={datasetQualityDetailsController} />;
  }
);
