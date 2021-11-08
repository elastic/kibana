/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../../../common/lib/kibana';

export const useCloudPostureFindingsApi = () => {
  const { http } = useKibana().services;
  // TODO: add response types
  return useQuery(['csp_findings'], () => http.get<any[]>('/api/csp/findings'));
};
