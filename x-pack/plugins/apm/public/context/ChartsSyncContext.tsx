/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { toQuery, fromQuery } from '../components/shared/Links/url_helpers';
import { history } from '../utils/history';
import { useUrlParams } from '../hooks/useUrlParams';
import { useFetcher } from '../hooks/useFetcher';

const ChartsSyncContext = React.createContext<{
  hoverX: number | null;
  onHover: (hoverX: number) => void;
  onMouseLeave: () => void;
  onSelectionEnd: (range: { start: number; end: number }) => void;
} | null>(null);

const ChartsSyncContextProvider: React.FC = ({ children }) => {
  const [time, setTime] = useState<number | null>(null);
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const { environment } = uiFilters;

  const { data = { annotations: [] } } = useFetcher(
    callApmApi => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/annotations',
          params: {
            path: {
              serviceName
            },
            query: {
              start,
              end,
              environment
            }
          }
        });
      }
    },
    [start, end, environment, serviceName]
  );

  const value = useMemo(() => {
    const hoverXHandlers = {
      onHover: (hoverX: number) => {
        setTime(hoverX);
      },
      onMouseLeave: () => {
        setTime(null);
      },
      onSelectionEnd: (range: { start: number; end: number }) => {
        setTime(null);

        const currentSearch = toQuery(history.location.search);
        const nextSearch = {
          rangeFrom: new Date(range.start).toISOString(),
          rangeTo: new Date(range.end).toISOString()
        };

        history.push({
          ...history.location,
          search: fromQuery({
            ...currentSearch,
            ...nextSearch
          })
        });
      },
      hoverX: time,
      annotations: data.annotations
    };

    return { ...hoverXHandlers };
  }, [time, data.annotations]);

  return <ChartsSyncContext.Provider value={value} children={children} />;
};

export { ChartsSyncContext, ChartsSyncContextProvider };
