/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../context/kibana_context/use_kibana';

export function useLogsIndexPattern() {
  const {
    services: {
      logsDataAccess: {
        services: { logSourcesService },
      },
    },
  } = useKibana();

  const { value, loading, error } = useAsync(logSourcesService.getFlattenedLogSources);

  return { logsIndexPattern: value, loading, error };
}
