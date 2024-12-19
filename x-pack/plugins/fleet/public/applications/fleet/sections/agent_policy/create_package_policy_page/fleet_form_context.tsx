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
  validate: () => boolean;
  isValid: boolean;
  setIsValid: (isValid: boolean) => void;
}

interface FleetFormProviderProps {
  children: React.ReactNode;
}

const FleetFormContext = createContext<FleetFormContextValue | undefined>(undefined);

export function FleetFormProvider({ children }: FleetFormProviderProps) {
  const [validationRules, setValidationRules] = React.useState<ValidationRule[]>([]);
  const [isValid, setIsValid] = React.useState<boolean>(true);

  const addValidationRules = (rules: ValidationRule[]) => {
    console.log('request to add rules', rules);
    if (rules.length === 0 && validationRules.length > 0) {
      console.log('resetting validation rules');
      setValidationRules([]);
      return;
    }

    const newRules = rules.filter((rule) => !validationRules.some((r) => r.id === rule.id));
    if (newRules.length > 0) {
      console.log('adding new validation rules', newRules);
      setValidationRules([...validationRules, ...newRules]);
    }
  };

  // const resetValidationRules = () => {
  //   if (validationRules.length > 0) {
  //     setValidationRules([]);
  //   }
  // };

  const validate = () => {
    if (validationRules.length === 0) {
      console.log('no validation rules to validate');
      return true;
    }

    // implies all rules are reuired
    console.log('validating rules', validationRules);
    return validationRules.every((rule) => !!rule.value);
  };

  return (
    <FleetFormContext.Provider value={{ addValidationRules, validate, isValid, setIsValid }}>
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
    // resetValidationRules: context.resetValidationRules,
    isValid: context.isValid,
    setIsValid: context.setIsValid,
  };
};
