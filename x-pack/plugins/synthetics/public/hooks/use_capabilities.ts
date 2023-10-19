/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MonitorLocations } from '../../common/runtime_types';

export const useCanEditSynthetics = () => {
  return !!useKibana().services?.application?.capabilities.uptime.save;
};

export const useCanUsePublicLocations = (monLocations?: MonitorLocations) => {
  const canUsePublicLocations =
    useKibana().services?.application?.capabilities.uptime.elasticManagedLocationsEnabled ?? true;
  const publicLocations = monLocations?.some((loc) => loc.isServiceManaged);

  if (!publicLocations) {
    return true;
  }

  return !!canUsePublicLocations;
};
