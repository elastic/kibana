/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import { Annotation } from '../../../common/annotations';
import { useApmParams } from '../../hooks/use_apm_params';
import { useFetcher } from '../../hooks/use_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';

export const AnnotationsContext = createContext({ annotations: [] } as {
  annotations: Annotation[];
});

const INITIAL_STATE = { annotations: [] };

export function AnnotationsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { path } = useApmParams('/*');

  const serviceName = 'serviceName' in path ? path.serviceName : undefined;

  const {
    urlParams: { environment, start, end },
  } = useUrlParams();

  const { data = INITIAL_STATE } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, start, end, serviceName]
  );

  return <AnnotationsContext.Provider value={data} children={children} />;
}
