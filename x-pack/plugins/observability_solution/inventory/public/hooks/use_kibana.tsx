/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useMemo } from 'react';
import type { InventoryStartDependencies } from '../types';
import type { InventoryServices } from '../services/types';

export interface InventoryKibanaContext {
  core: CoreStart;
  dependencies: { start: InventoryStartDependencies };
  services: InventoryServices;
}

const useTypedKibana = (): InventoryKibanaContext => {
  const context = useKibana<CoreStart & Omit<InventoryKibanaContext, 'core'>>();

  return useMemo(() => {
    const { dependencies, services, ...core } = context.services;

    return {
      core,
      dependencies,
      services,
    };
  }, [context.services]);
};

export { useTypedKibana as useKibana };
