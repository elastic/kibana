/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext, useContext } from 'react';
import { DatasetQualityControllerStateService } from '../../state_machines/dataset_quality_controller';

export interface DatasetQualityContextValue {
  service: DatasetQualityControllerStateService;
}

export const DatasetQualityContext = createContext({} as DatasetQualityContextValue);

export function useDatasetQualityContext() {
  return useContext(DatasetQualityContext);
}
