/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useState, useCallback, useEffect } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import createContainer from 'constate';
import type { InfraClientStartDeps } from '../../../../types';
import { useUrlState } from '../../../../utils/use_url_state';

export const DEFAULT_HOSTS_FILTERS_STATE: HostsQueryState = {
  language: 'kuery',
  expression: '',
};

export const useHostsQuery = () => {
  const { services } = useKibana<InfraClientStartDeps>();
  const {
    data: { query: queryManager },
  } = services;

  const { queryString } = queryManager;

  const [urlState, setUrlState] = useUrlState<HostsQueryState>({
    defaultState: DEFAULT_HOSTS_FILTERS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'query',
  });

  const [state, setState] = useState<HostsQueryState>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  useEffect(
    () =>
      queryString.setQuery({
        ...queryString.getQuery(),
        query: state.expression,
        language: state.language,
      }),
    [queryString, state]
  );

  const applyFilterQuery = useCallback((filterQuery: HostsQueryState) => {
    setState(filterQuery);
  }, []);

  return {
    filterQuery: urlState,
    applyFilterQuery,
  };
};

export const HostsQueryStateRT = rt.type({
  language: rt.string,
  expression: rt.string,
});

export type HostsQueryState = rt.TypeOf<typeof HostsQueryStateRT>;
const encodeUrlState = HostsQueryStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(HostsQueryStateRT.decode(value), fold(constant(undefined), identity));

export const [HostsQueryProvider, useHostsQueryContext] = createContainer(useHostsQuery);
