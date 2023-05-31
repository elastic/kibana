/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/react';
import type { DataView } from '@kbn/data-plugin/common';
import { CspClientPluginStartDeps } from '../../types';

/**
 *  TODO: use perfected kibana data views
 */
export const useLatestFindingsDataView = (dataView: string) => {
  const {
    data: { dataViews },
  } = useKibana<CspClientPluginStartDeps>().services;

  const findDataView = async (): Promise<DataView> => {
    const dataViewObj = (await dataViews.find(dataView))?.[0];
    if (!dataViewObj) {
      throw new Error(`Data view not found [Name: {${dataView}}]`);
    }

    return dataViewObj;
  };

  return useQuery([`useDataView-${dataView}`], findDataView);
};
