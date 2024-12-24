/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';

interface ValidationRule {
  id: string;
  value: string;
}

interface FleetFormContextValue {
  addValidationRules: (rules: ValidationRule[]) => void;
  // resetValidationRules: () => void;
  validate: () => string[] | undefined;
  validationRules: ValidationRule[];
  // isValid: boolean;
  // setIsValid: (isValid: boolean) => void;
}

interface FleetFormProviderProps {
  children: React.ReactNode;
}

const FleetFormContext = createContext<FleetFormContextValue | undefined>(undefined);

export function FleetFormProvider({ children }: FleetFormProviderProps) {
  const [validationRules, setValidationRules] = React.useState<ValidationRule[]>([]);

  const addValidationRules = (rules: ValidationRule[]) => {
    console.log('request to add rules', rules);
    if (rules.length === 0 && validationRules.length > 0) {
      console.log('resetting validation rules');
      setValidationRules([]);
      return;
    }

    const newRules = rules.filter((rule) => !validationRules.some((r) => r.id === rule.id));
    const existingRulesWithNewValues = rules.filter((rule) =>
      validationRules.some((r) => r.id === rule.id && r.value !== rule.value)
    );

    const newAndExistingRules = [...newRules, ...existingRulesWithNewValues];
    if (newAndExistingRules.length > 0) {
      // remove the dupes
      const removedDupes = validationRules.filter(
        (rule) => !newAndExistingRules.some((r) => r.id === rule.id)
      );
      console.log('adding new validation rules', [...removedDupes, ...newAndExistingRules]);
      setValidationRules([...removedDupes, ...newAndExistingRules]);
    }
  };

  // const resetValidationRules = () => {
  //   if (validationRules.length > 0) {
  //     setValidationRules([]);
  //   }
  // };

  const validate = (): string[] | undefined => {
    if (validationRules.length === 0) {
      console.log('no validation rules to validate');
      return undefined;
    }

    // implies all inputs are required
    const invalidInputs = validationRules.filter((rule) => !rule.value).map((rule) => rule.id);
    console.log('validate: invalid inputs', invalidInputs);
    if (invalidInputs.length > 0) {
      return invalidInputs;
    }

    return undefined;
  };

  return (
    <FleetFormContext.Provider value={{ addValidationRules, validate, validationRules }}>
      {children}
    </FleetFormContext.Provider>
  );
}

export const useFleetForm = () => {
  const context = React.useContext(FleetFormContext);
  if (!context) {
    throw new Error('useFleetForm must be used within a FleetFormProvider');
  }
  return {
    validate: context.validate,
    addValidationRules: context.addValidationRules,
    validationRules: context.validationRules,
    // resetValidationRules: context.resetValidationRules,
    // isValid: context.isValid,
    // setIsValid: context.setIsValid,
  };
};
