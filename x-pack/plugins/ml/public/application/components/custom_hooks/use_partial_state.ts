/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

/**
 * Custom hook for partial state update.
 */
export function usePartialState<T>(initialValue: T): [T, (update: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialValue);
  const setFormStateCallback = (update: Partial<T>) => {
    setState({
      ...state,
      ...update,
    });
  };
  return [state, setFormStateCallback];
}
