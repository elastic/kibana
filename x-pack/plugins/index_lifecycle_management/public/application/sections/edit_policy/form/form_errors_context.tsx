/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, FunctionComponent, useState, useCallback } from 'react';

import { Phases as _Phases } from '../../../../../common/types';

import { useFormContext } from '../../../../shared_imports';

import { FormInternal } from '../types';

type Phases = keyof _Phases;

type PhasesAndOther = Phases | 'other';

interface ErrorGroup {
  [fieldPath: string]: string[];
}

interface Errors {
  hasErrors: boolean;
  hot: ErrorGroup;
  warm: ErrorGroup;
  cold: ErrorGroup;
  frozen: ErrorGroup;
  delete: ErrorGroup;
  /**
   * Errors that are not specific to a phase should go here.
   */
  other: ErrorGroup;
}

interface ContextValue {
  errors: Errors;
  addError(phase: PhasesAndOther, fieldPath: string, errorMessages: string[]): void;
  clearError(phase: PhasesAndOther, fieldPath: string): void;
  isFormSubmitted: boolean;
}

const FormErrorsContext = createContext<ContextValue>(null as any);

const createEmptyErrors = (): Errors => ({
  hasErrors: false,
  hot: {},
  warm: {},
  cold: {},
  frozen: {},
  delete: {},
  other: {},
});

export const FormErrorsProvider: FunctionComponent<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [errors, setErrors] = useState<Errors>(createEmptyErrors);
  const form = useFormContext<FormInternal>();

  const { getErrors: getFormErrors, isSubmitted } = form;

  const addError: ContextValue['addError'] = useCallback(
    (phase, fieldPath, errorMessages) => {
      setErrors((previousErrors) => ({
        ...previousErrors,
        hasErrors: true,
        [phase]: {
          ...previousErrors[phase],
          [fieldPath]: errorMessages,
        },
      }));
    },
    [setErrors]
  );

  const clearError: ContextValue['clearError'] = useCallback(
    (phase, fieldPath) => {
      if (getFormErrors().length) {
        setErrors((previousErrors) => {
          const {
            [phase]: { [fieldPath]: fieldErrorToOmit, ...restOfPhaseErrors },
            hasErrors,
            ...otherPhases
          } = previousErrors;

          const nextHasErrors =
            Object.keys(restOfPhaseErrors).length > 0 ||
            Object.values(otherPhases).some((phaseErrors) => {
              // @ts-expect-error upgrade typescript v4.9.5
              return Object.keys(phaseErrors).length > 0;
            });

          return {
            ...previousErrors,
            hasErrors: nextHasErrors,
            [phase]: restOfPhaseErrors,
          };
        });
      } else {
        setErrors(createEmptyErrors);
      }
    },
    [getFormErrors, setErrors]
  );

  return (
    <FormErrorsContext.Provider
      value={{
        errors,
        addError,
        clearError,
        isFormSubmitted: isSubmitted,
      }}
    >
      {children}
    </FormErrorsContext.Provider>
  );
};

export const useFormErrorsContext = () => {
  const ctx = useContext(FormErrorsContext);
  if (!ctx) {
    throw new Error('useFormErrorsContext can only be used inside of FormErrorsProvider');
  }

  return ctx;
};
