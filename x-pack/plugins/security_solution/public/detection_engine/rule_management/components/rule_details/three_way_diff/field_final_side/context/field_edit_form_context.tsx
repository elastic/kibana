/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  type PropsWithChildren,
  useState,
  useCallback,
} from 'react';
import type { FormHook } from '../../../../../../../shared_imports';
import { invariant } from '../../../../../../../../common/utils/invariant';

type FieldEditFormCleanUp = () => void;

interface FieldEditFormContextType {
  form: FormHook | undefined;
  registerForm: (form: FormHook) => FieldEditFormCleanUp;
}

const FieldEditFormContext = createContext<FieldEditFormContextType | null>(null);

export function FieldEditFormContextProvider({ children }: PropsWithChildren<{}>) {
  const [form, setForm] = useState<FormHook | undefined>();
  const registerForm = useCallback(
    (formToRegister: FormHook) => {
      setForm((prevForm) => {
        if (prevForm) {
          throw new Error(
            'Unexpected new form registration while the old one was not cleaned. Do you properly cleanup form by returning registerForm result from useEffect.'
          );
        }

        return formToRegister;
      });

      return () => setForm(undefined);
    },
    [setForm]
  );

  return (
    <FieldEditFormContext.Provider value={{ form, registerForm }}>
      {children}
    </FieldEditFormContext.Provider>
  );
}

export function useFieldEditFormContext() {
  const context = useContext(FieldEditFormContext);

  invariant(
    context !== null,
    'useFieldEditFormContext must be used inside a FieldEditFormProvider'
  );

  return context;
}
