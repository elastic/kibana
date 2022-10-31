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
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { FilterStateStore } from '@kbn/es-query';
import type { InfraClientStartDeps } from '../../../../types';
import { useUrlState } from '../../../../utils/use_url_state';

export const DEFAULT_HOSTS_FILTERS_STATE = [];

export const useHostFilters = () => {
  const { services } = useKibana<InfraClientStartDeps>();
  const {
    data: { query: queryManager },
  } = services;

  const { filterManager } = queryManager;

  const [urlState, setUrlState] = useUrlState<HostsFilters>({
    defaultState: DEFAULT_HOSTS_FILTERS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'filters',
  });

  const [state, setState] = useState<HostsFilters>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  useEffect(() => filterManager.setFilters(state), [filterManager, state]);

  const applyFilters = useCallback((filters: HostsFilters) => {
    setState(filters);
  }, []);

  return {
    filters: urlState,
    applyFilters,
  };
};

export const HostsFilterRT = rt.intersection([
  rt.partial({
    $state: rt.type({
      store: enumeration('FilterStateStore', FilterStateStore),
    }),
  }),
  rt.type({
    meta: rt.partial({
      alias: rt.union([rt.null, rt.string]),
      disabled: rt.boolean,
      negate: rt.boolean,
      controlledBy: rt.string,
      group: rt.string,
      index: rt.string,
      isMultiIndex: rt.boolean,
      type: rt.string,
      key: rt.string,
      params: rt.any,
      value: rt.any,
    }),
  }),
  rt.partial({
    query: rt.record(rt.string, rt.any),
  }),
]);

const HostsFiltersRT = rt.array(HostsFilterRT);

export type HostsFilters = rt.TypeOf<typeof HostsFiltersRT>;
const encodeUrlState = HostsFiltersRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(HostsFiltersRT.decode(value), fold(constant([]), identity));

export const [HostFiltersProvider, useHostFiltersContext] = createContainer(useHostFilters);
