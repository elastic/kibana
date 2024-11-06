/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EntitiesAppStartDependencies } from '../types';
import type { EntitiesAppServices } from '../services/types';

export interface EntitiesAppKibanaContext {
  core: CoreStart;
  dependencies: {
    start: EntitiesAppStartDependencies;
  };
  services: EntitiesAppServices;
}

const useTypedKibana = (): EntitiesAppKibanaContext => {
  const context = useKibana<CoreStart & Omit<EntitiesAppKibanaContext, 'core'>>();

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
