/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSelector } from '@xstate/react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';

export function useEmptyState() {
  const { service } = useDatasetQualityContext();

  const canReadDataset = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canRead
  );
  return { canReadDataset };
}
