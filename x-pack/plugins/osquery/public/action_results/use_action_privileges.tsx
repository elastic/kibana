/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';

export const useActionResultsPrivileges = () => {
  const { http } = useKibana().services;

  return useQuery(
    ['actionResultsPrivileges'],
    () => http.get('/internal/osquery/privileges_check'),
    {
      keepPreviousData: true,
    }
  );
};
