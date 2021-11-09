/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { KibanaServicesContextValue } from './kibana_services_context';

/**
 * A wrapper around `useKibana` that provides the correct types.
 */
export function useKibanaServicesContext() {
  return useKibana<KibanaServicesContextValue>().services;
}
