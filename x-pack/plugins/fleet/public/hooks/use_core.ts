/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { FleetStart, FleetStartServices } from '../plugin';

// Downstream plugins may set `fleet` as part of the Kibana context
export function useStartServices(): FleetStartServices & { fleet?: FleetStart } {
  const { services } = useKibana<FleetStartServices & { fleet?: FleetStart }>();
  if (services === null) {
    throw new Error('KibanaContextProvider not initialized');
  }

  return services;
}
