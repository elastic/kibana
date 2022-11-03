/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../utils/use_url_state';

export const DEFAULT_HOST_QUERY_STATE: HostsQueryState = {
  language: 'kuery',
  expression: '',
};
const HOST_QUERY_URL_STATE_KEY = 'query';

export const useHostsQuery = () => {
  const [urlState, setUrlState] = useUrlState<HostsQueryState>({
    defaultState: DEFAULT_HOST_QUERY_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_QUERY_URL_STATE_KEY,
  });

  const [state, setState] = useState<HostsQueryState>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  const applyFilterQuery = useCallback((filterQuery: HostsQueryState) => {
    setState(filterQuery);
  }, []);

  return {
    filterQuery: urlState,
    applyFilterQuery,
  };
};

const HostsQueryStateRT = rt.type({
  language: rt.string,
  expression: rt.string,
});

type HostsQueryState = rt.TypeOf<typeof HostsQueryStateRT>;
const encodeUrlState = HostsQueryStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(HostsQueryStateRT.decode(value), fold(constant(undefined), identity));
