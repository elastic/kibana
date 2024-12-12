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

interface FleetCustomUIContextValue {
  addValidationRules: (rules: ValidationRule[]) => void;
  resetValidationRules: () => void;
  validate: () => boolean;
}

interface FleetCustomUIProviderProps {
  children: React.ReactNode;
}

const FleetCustomUIContext = createContext<FleetCustomUIContextValue | undefined>(undefined);

export function FleetCustomUIProvider({ children }: FleetCustomUIProviderProps) {
  const [validationRules, setValidationRules] = React.useState<ValidationRule[]>([]);

  const addValidationRules = (rules: ValidationRule[]) => {
    const newRules = rules.filter((rule) => !validationRules.some((r) => r.id === rule.id));
    if (newRules.length > 0) {
      setValidationRules([...validationRules, ...newRules]);
    }
  };

  const resetValidationRules = () => {
    if (validationRules.length > 0) {
      setValidationRules([]);
    }
  };

  const validate = () => {
    if (validationRules.length === 0) {
      return true;
    }

    // implies all rules are reuired
    return validationRules.every((rule) => !!rule.value);
  };

  return (
    <FleetCustomUIContext.Provider value={{ addValidationRules, resetValidationRules, validate }}>
      {children}
    </FleetCustomUIContext.Provider>
  );
}

export const useFleetCustomUI = () => {
  const context = React.useContext(FleetCustomUIContext);
  if (!context) {
    throw new Error('useFleetCustomUI must be used within a FleetCustomUIProvider');
  }
  return {
    validate: context.validate,
    addValidationRules: context.addValidationRules,
    resetValidationRules: context.resetValidationRules,
  };
};
