/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, FunctionComponent, useEffect, useState } from 'react';
import { produce } from 'immer';

import { useFormData, useFormContext } from '../../../../shared_imports';

import { FormInternal } from '../types';

interface ContextValue {
  hasErrors: boolean;
  errors: {
    hot: string[];
    warm: string[];
    cold: string[];
    /**
     * Errors that are not specific to a phase should go here.
     */
    other: string[];
  };
}

const FormErrorsContext = createContext<ContextValue>(null as any);

const defaultContextValue: ContextValue = {
  hasErrors: false,
  errors: { hot: [], warm: [], cold: [], other: [] },
};

const isXPhaseField = (phase: 'hot' | 'warm' | 'cold') => (fieldPath: string): boolean =>
  fieldPath.startsWith(`phases.${phase}`) || fieldPath.startsWith(`_meta.${phase}`);

const isHotPhaseField = isXPhaseField('hot');
const isWarmPhaseField = isXPhaseField('warm');
const isColdPhaseField = isXPhaseField('cold');

export const FormErrorsProvider: FunctionComponent = ({ children }) => {
  const [errors, setErrors] = useState<ContextValue>(defaultContextValue);

  const form = useFormContext<FormInternal>();

  // Hook into form updates
  const [formData] = useFormData<FormInternal>();

  useEffect(() => {
    // This is a hack, we need to wait for the next tick to let all of the async validation complete.
    setTimeout(() => {
      const fields = form.getFields();
      const result = produce<ContextValue>(defaultContextValue, (draft) => {
        Object.entries(fields).forEach(([key, value]) => {
          const errorMessages = value.getErrorsMessages();
          if (!errorMessages) {
            return;
          }
          draft.hasErrors = true;
          if (isHotPhaseField(key)) {
            draft.errors.hot.push(errorMessages);
          } else if (isWarmPhaseField(key)) {
            draft.errors.warm.push(errorMessages);
          } else if (isColdPhaseField(key)) {
            draft.errors.cold.push(errorMessages);
          } else {
            draft.errors.other.push(errorMessages);
          }
        });
      });
      setErrors(result);
    });
  }, [form, formData, setErrors]);

  return <FormErrorsContext.Provider value={errors}>{children}</FormErrorsContext.Provider>;
};

export const useFormErrorsContext = () => {
  const ctx = useContext(FormErrorsContext);
  if (!ctx) {
    throw new Error('useFormErrorsContext can only be used inside of FormErrorsProvider');
  }

  return ctx;
};
