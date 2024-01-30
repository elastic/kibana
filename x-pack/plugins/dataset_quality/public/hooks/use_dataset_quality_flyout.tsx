/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityFlyout = () => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const { service } = useDatasetQualityContext();

  const { dataset: dataStreamStat, datasetDetails: dataStreamDetails } = useSelector(
    service,
    (state) => state.context.flyout
  );
  const dataStreamDetailsLoading = useSelector(service, (state) =>
    state.matches('datasets.loaded.flyoutOpen.fetching')
  );

  return {
    dataStreamStat,
    dataStreamDetails,
    dataStreamDetailsLoading,
    fieldFormats,
  };
};
