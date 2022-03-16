/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import { Annotation } from '../../../common/annotations';
import { useFetcher } from '../../hooks/use_fetcher';

export const AnnotationsContext = createContext({ annotations: [] } as {
  annotations: Annotation[];
});

const INITIAL_STATE = { annotations: [] };

export function AnnotationsContextProvider({
  children,
  environment,
  start,
  end,
  serviceName,
}: {
  children: React.ReactNode;
  environment: string;
  start: string;
  end: string;
  serviceName?: string;
}) {
  const { data = INITIAL_STATE } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi(
          'GET /api/apm/services/{serviceName}/annotation/search',
          {
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
          }
        );
      }
    },
    [environment, start, end, serviceName]
  );

  return <AnnotationsContext.Provider value={data} children={children} />;
}
