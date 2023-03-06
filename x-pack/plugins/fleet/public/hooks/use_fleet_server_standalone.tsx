/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExperimentalFeaturesService } from '../applications/fleet/services';

export function useFleetServerStandalone() {
  const isFleetServerStandalone = ExperimentalFeaturesService.get().fleetServerStandalone;

  return { isFleetServerStandalone };
}
