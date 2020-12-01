/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useParams } from 'react-router-dom';
import { Annotation } from '../../../common/annotations';
import { useFetcher } from '../../hooks/use_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';
import { callApmApi } from '../../services/rest/createCallApmApi';

export const AnnotationsContext = createContext({ annotations: [] } as {
  annotations: Annotation[];
});

const INITIAL_STATE = { annotations: [] };

export function AnnotationsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;
  const { environment } = uiFilters;

  const { data = INITIAL_STATE } = useFetcher(() => {
    if (start && end && serviceName) {
      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            environment,
          },
        },
      });
    }
  }, [start, end, environment, serviceName]);

  return <AnnotationsContext.Provider value={data} children={children} />;
}
