/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export function useCore(): CoreStart {
  const { services } = useKibana();
  if (services === null) {
    throw new Error('KibanaContextProvider not initialized');
  }
  return services;
}
