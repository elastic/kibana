/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import { DatasetQualityController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getDatasetQualityStateFromUrl,
  updateUrlFromDatasetQualityState,
} from './url_state_storage_service';

const DatasetQualityContext = createContext<{ controller?: DatasetQualityController }>({});

interface ContextProps {
  children: JSX.Element;
  urlStateStorageContainer: IKbnUrlStateStorage;
  toastsService: IToasts;
  datasetQuality: DatasetQualityPluginStart;
}

export function DatasetQualityContextProvider({
  children,
  urlStateStorageContainer,
  toastsService,
  datasetQuality,
}: ContextProps) {
  const [controller, setController] = useState<DatasetQualityController>();

  useEffect(() => {
    async function getDatasetQualityController() {
      const initialState = getDatasetQualityStateFromUrl({
        urlStateStorageContainer,
        toastsService,
      });

      const datasetQualityController = await datasetQuality.createDatasetQualityController({
        initialState,
      });
      datasetQualityController.service.start();

      setController(datasetQualityController);

      const datasetQualityStateSubscription = datasetQualityController.state$.subscribe((state) => {
        updateUrlFromDatasetQualityState({
          urlStateStorageContainer,
          datasetQualityState: state,
        });
      });

      return () => {
        datasetQualityController.service.stop();
        datasetQualityStateSubscription.unsubscribe();
      };
    }
    getDatasetQualityController();
  }, [datasetQuality, toastsService, urlStateStorageContainer]);

  return (
    <DatasetQualityContext.Provider value={{ controller }}>
      {children}
    </DatasetQualityContext.Provider>
  );
}

export const useDatasetQualityContext = () => {
  const context = useContext(DatasetQualityContext);
  if (context === undefined) {
    throw new Error(
      'useDatasetQualityContext must be used within a <DatasetQualityContextProvider />'
    );
  }
  return context;
};
