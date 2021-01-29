/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  useContext,
  FunctionComponent,
  useEffect,
  useState,
  useRef,
} from 'react';

import { useFormData, useFormContext } from '../../../../shared_imports';

import { FormInternal } from '../types';

interface ContextValue {
  hasErrors: boolean;
  hot: string[];
  warm: string[];
  cold: string[];
  /**
   * Errors that are not specific to a phase should go here.
   */
  other: string[];
}

const FormErrorsContext = createContext<ContextValue>(null as any);

const isXPhaseField = (phase: 'hot' | 'warm' | 'cold') => (fieldPath: string): boolean =>
  fieldPath.startsWith(`phases.${phase}`) || fieldPath.startsWith(`_meta.${phase}`);

const isHotPhaseField = isXPhaseField('hot');
const isWarmPhaseField = isXPhaseField('warm');
const isColdPhaseField = isXPhaseField('cold');

const createEmptyContextValue = (): ContextValue => ({
  hasErrors: false,
  hot: [],
  warm: [],
  cold: [],
  other: [],
});

export const FormErrorsProvider: FunctionComponent = ({ children }) => {
  const [contextValue, setContextValue] = useState<ContextValue>(createEmptyContextValue);
  const { hasErrors } = contextValue;
  const isMounted = useRef<boolean>(false);

  const form = useFormContext<FormInternal>();

  // Hook into form updates
  const [formData] = useFormData<FormInternal>();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      return;
    }
    // This is a hack, we need to wait for the next tick to let all of the async validation complete
    // and have form errors populate. It would be best if there were another way to listen/hook into
    // form errors.
    setTimeout(() => {
      // For now, we check on the form for any error messages and since we do not have a way to tie
      // these back to fields we need to loop through the fields. This if check just makes sure we
      // do not do this work if there are no form errors.
      if (form.getErrors().length) {
        const fields = form.getFields();
        const result: ContextValue = {
          hasErrors: true,
          hot: [],
          warm: [],
          cold: [],
          other: [],
        };
        Object.entries(fields).forEach(([fieldPath, field]) => {
          const errorMessages = field.getErrorsMessages();
          if (!errorMessages) {
            return;
          }
          if (isHotPhaseField(fieldPath)) {
            result.hot.push(errorMessages);
          } else if (isWarmPhaseField(fieldPath)) {
            result.warm.push(errorMessages);
          } else if (isColdPhaseField(fieldPath)) {
            result.cold.push(errorMessages);
          } else {
            result.other.push(errorMessages);
          }
        });
        setContextValue(result);
      } else if (hasErrors === true) {
        setContextValue(createEmptyContextValue);
      }
    });
  }, [form, formData, hasErrors, setContextValue]);

  return <FormErrorsContext.Provider value={contextValue}>{children}</FormErrorsContext.Provider>;
};

export const useFormErrorsContext = () => {
  const ctx = useContext(FormErrorsContext);
  if (!ctx) {
    throw new Error('useFormErrorsContext can only be used inside of FormErrorsProvider');
  }

  return ctx;
};
