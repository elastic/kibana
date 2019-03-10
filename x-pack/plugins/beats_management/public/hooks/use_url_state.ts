/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { parse, stringify } from 'querystring';
import { useState } from 'react';
import { FlatObject } from '../frontend_types';
import { useRouter } from './use_react_router';

type StateCallback<T> = (previousState: T) => T;

interface HookValue<URLState> {
  goTo: (path: string) => void;
  setUrlState: (
    newState:
      | Partial<FlatObject<URLState>>
      | StateCallback<URLState>
      | Promise<StateCallback<URLState>>
  ) => void;
  urlState: URLState;
}

export const useURLState = <URLState = object>(): HookValue<URLState> => {
  const router = useRouter();
  const forceUpdate = () => useState(null)[1];

  const urlState = (parse(
    decodeURIComponent(router.history.location.search).substring(1)
  ) as any) as URLState;

  const setUrlState = async (
    state:
      | Partial<FlatObject<URLState>>
      | StateCallback<URLState>
      | Promise<StateCallback<URLState>>
  ) => {
    let newState;
    const pastState = urlState;
    if (typeof state === 'function') {
      newState = await state(pastState);
    } else {
      newState = state;
    }

    const search: string = stringify({
      ...(pastState as any),
      ...(newState as any),
    });

    const newLocation = {
      ...router.history.location,
      search,
    };

    router.history.replace(newLocation);
    forceUpdate();
  };

  const goTo = (path: string) => {
    router.history.push({
      pathname: path,
      search: router.history.location.search,
    });
  };

  return {
    goTo,
    setUrlState,
    urlState,
  };
};
