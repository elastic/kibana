/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

/**
 * Returns an object which ingest permissions are allowed
 */
export const useIngestEnabledCheck = (): {
  allEnabled: boolean;
  show: boolean;
  write: boolean;
  read: boolean;
} => {
  const { services } = useKibana();

  // Check if Ingest Manager is present in the configuration
  const show = services.application.capabilities.ingestManager?.show ?? false;
  const write = services.application.capabilities.ingestManager?.write ?? false;
  const read = services.application.capabilities.ingestManager?.read ?? false;

  // Check if all Ingest Manager permissions are enabled
  const allEnabled = show && read && write ? true : false;

  return {
    allEnabled,
    show,
    write,
    read,
  };
};
