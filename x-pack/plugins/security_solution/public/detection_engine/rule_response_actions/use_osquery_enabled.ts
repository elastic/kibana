/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../common/lib/kibana';

export const useOsqueryEnabled = () => {
  const { osquery } = useKibana().services;

  const osqueryStatus = osquery?.fetchInstallationStatus();
  return !osqueryStatus?.loading && !osqueryStatus?.disabled && !osqueryStatus?.permissionDenied;
};
