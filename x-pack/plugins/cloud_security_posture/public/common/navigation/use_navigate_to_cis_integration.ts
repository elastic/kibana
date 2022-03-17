/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters } from '../../../../fleet/public';
import { useKibana } from '../hooks/use_kibana';

const CIS_INTEGRATION_PATH = pagePathGetters.integrations_all({ searchTerm: 'CIS' }).join('');

export const useCISIntegrationLink = () => {
  const { http } = useKibana().services;
  return http.basePath.prepend(CIS_INTEGRATION_PATH);
};
