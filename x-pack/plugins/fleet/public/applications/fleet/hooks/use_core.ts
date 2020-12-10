/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FleetStartServices } from '../../../plugin';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export function useStartServices(): FleetStartServices {
  const { services } = useKibana<FleetStartServices>();
  if (services === null) {
    throw new Error('KibanaContextProvider not initialized');
  }
  return services;
}
