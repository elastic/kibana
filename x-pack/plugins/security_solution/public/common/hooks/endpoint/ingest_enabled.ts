/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'src/core/public';
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
  const { services } = useKibana<{ application: ApplicationStart }>();

  // Check if Ingest Manager is present in the configuration
  const show = Boolean(services.application.capabilities.ingestManager?.show);
  const write = Boolean(services.application.capabilities.ingestManager?.write);
  const read = Boolean(services.application.capabilities.ingestManager?.read);

  // Check if all Ingest Manager permissions are enabled
  const allEnabled = show && read && write ? true : false;

  return {
    allEnabled,
    show,
    write,
    read,
  };
};
