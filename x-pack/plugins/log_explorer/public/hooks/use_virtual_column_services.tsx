/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import type { DataView } from '@kbn/data-views-plugin/common';
import { LogExplorerDiscoverServices } from '../controller';

export interface UseVirtualColumnServices {
  services: {
    data: LogExplorerDiscoverServices['data'];
    dataView: DataView;
  };
}

const useVirtualColumns = ({ services }: UseVirtualColumnServices) => services;

export const [VirtualColumnServiceProvider, useVirtualColumnServiceContext] =
  createContainer(useVirtualColumns);
