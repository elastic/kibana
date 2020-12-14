/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { ServiceDetailsContext } from './service_details_context';

export function useServiceDetailsFetcher() {
  const context = useContext(ServiceDetailsContext);

  if (!context) {
    throw new Error('Missing Service Details context provider');
  }

  return context;
}
