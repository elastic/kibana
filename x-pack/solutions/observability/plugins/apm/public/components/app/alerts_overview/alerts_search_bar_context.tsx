/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { BoolQuery, Filter } from '@kbn/es-query';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { isEnvironmentDefined } from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { push } from '../../shared/links/url_helpers';

interface AlertsSearchBarContextValue {
  apmFilters: Filter[];
  filterControls: Filter[];
  setFilterControls: React.Dispatch<React.SetStateAction<Filter[]>>;
  esQuery: { bool: BoolQuery } | undefined;
  setEsQuery: React.Dispatch<React.SetStateAction<{ bool: BoolQuery } | undefined>>;
  onKueryChange: (value: any) => void;
}

const AlertsSearchBarStateContext = createContext<AlertsSearchBarContextValue | undefined>(
  undefined
);

export function useAlertsSearchBarContext() {
  const ctx = useContext(AlertsSearchBarStateContext);
  if (!ctx) {
    throw new Error('useAlertsSearchBarContext must be used within AlertsSearchBarContextProvider');
  }
  return ctx;
}

export function AlertsSearchBarContextProvider({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const {
    path: { serviceName },
    query: { environment },
  } = useAnyOfApmParams('/services/{serviceName}/alerts', '/mobile-services/{serviceName}/alerts');

  const [filterControls, setFilterControls] = useState<Filter[]>([]);
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  const onKueryChange = useCallback(
    (value: any) => push(history, { query: { kuery: value } }),
    [history]
  );

  const apmFilters = useMemo(() => {
    const filters: Filter[] = [
      {
        query: { match_phrase: { [SERVICE_NAME]: serviceName } },
        meta: {},
      },
    ];

    if (isEnvironmentDefined(environment)) {
      filters.push({
        query: {
          bool: {
            should: [
              { match_phrase: { [SERVICE_ENVIRONMENT]: environment } },
              {
                bool: {
                  filter: [
                    { term: { 'kibana.alert.rule.rule_type_id': SLO_BURN_RATE_RULE_TYPE_ID } },
                  ],
                  should: [
                    { term: { [SERVICE_ENVIRONMENT]: ALL_VALUE } },
                    { bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        meta: {},
      });
    }
    return filters;
  }, [serviceName, environment]);

  const value = useMemo(
    () => ({
      apmFilters,
      filterControls,
      setFilterControls,
      esQuery,
      setEsQuery,
      onKueryChange,
    }),
    [apmFilters, filterControls, esQuery, onKueryChange]
  );

  return (
    <AlertsSearchBarStateContext.Provider value={value}>
      {children}
    </AlertsSearchBarStateContext.Provider>
  );
}
