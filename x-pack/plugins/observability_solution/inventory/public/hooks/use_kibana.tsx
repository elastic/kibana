/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { InventoryStartDependencies } from '../types';
import type { InventoryServices } from '../services/types';

export interface InventoryKibanaContext {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  dependencies: { start: InventoryStartDependencies };
  services: InventoryServices;
}

const useTypedKibana = () => {
  return useKibana<InventoryKibanaContext>().services;
};

export { useTypedKibana as useKibana };
