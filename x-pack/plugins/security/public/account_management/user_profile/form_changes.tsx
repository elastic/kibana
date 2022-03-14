/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, useState } from 'react';

export interface FormChanges {
  count: number;
  register(isEqual: boolean): undefined | (() => void);
}

export const useFormChanges = (): FormChanges => {
  const [count, setCount] = useState(0);

  return {
    count,
    register: (isEqual: boolean) => {
      if (!isEqual) {
        setCount((c) => c + 1);
        return () => setCount((c) => c - 1);
      }
    },
  };
};

export const FormChangesContext = createContext<FormChanges | undefined>(undefined);

export const FormChangesProvider = FormChangesContext.Provider;

export function useFormChangesContext() {
  const context = useContext(FormChangesContext);

  if (!context) {
    throw new Error(
      'FormChanges context is undefined, please verify you are calling useFormChangesContext() as child of a <FormChangesProvider> component.'
    );
  }

  return context;
}
