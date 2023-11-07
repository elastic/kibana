/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';

export type VoidHandler = () => void;

export type DispatchWithOptionalAction<Type> = (_arg?: Type | unknown) => void;

export interface UseBooleanHandlers {
  on: VoidHandler;
  off: VoidHandler;
  toggle: DispatchWithOptionalAction<boolean>;
}

export type UseBooleanResult = [boolean, UseBooleanHandlers];

export const useBoolean = (initialValue: boolean = false): UseBooleanResult => {
  const [value, toggle] = useToggle(initialValue);

  const handlers = useMemo(
    () => ({
      toggle,
      on: () => toggle(true),
      off: () => toggle(false),
    }),
    [toggle]
  );

  return [value, handlers];
};
