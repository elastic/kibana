/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FunctionComponent, useContext } from 'react';
import { useFormData } from '../../../../shared_imports';
import { FormInternal } from '../types';
import { UseField } from './index';

export interface PhaseTimingConfiguration {
  /**
   * Whether this is the final, non-delete, phase.
   */
  isFinalDataPhase: boolean;
}

const getPhaseTimingConfiguration = (
  formData: FormInternal
): {
  hot: PhaseTimingConfiguration;
  warm: PhaseTimingConfiguration;
  cold: PhaseTimingConfiguration;
} => {
  const isWarmPhaseEnabled = formData?._meta?.warm?.enabled;
  const isColdPhaseEnabled = formData?._meta?.cold?.enabled;
  return {
    hot: { isFinalDataPhase: !isWarmPhaseEnabled && !isColdPhaseEnabled },
    warm: { isFinalDataPhase: isWarmPhaseEnabled && !isColdPhaseEnabled },
    cold: { isFinalDataPhase: isColdPhaseEnabled },
  };
};
export interface PhaseTimings {
  hot: PhaseTimingConfiguration;
  warm: PhaseTimingConfiguration;
  cold: PhaseTimingConfiguration;
  isDeletePhaseEnabled: boolean;
  setDeletePhaseEnabled: (enabled: boolean) => void;
}

const PhaseTimingsContext = createContext<PhaseTimings>(null as any);

export const PhaseTimingsProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData<FormInternal>({
    watch: ['_meta.warm.enabled', '_meta.cold.enabled', '_meta.delete.enabled'],
  });

  return (
    <UseField path="_meta.delete.enabled">
      {(field) => {
        return (
          <PhaseTimingsContext.Provider
            value={{
              ...getPhaseTimingConfiguration(formData),
              isDeletePhaseEnabled: formData?._meta?.delete?.enabled,
              setDeletePhaseEnabled: field.setValue,
            }}
          >
            {children}
          </PhaseTimingsContext.Provider>
        );
      }}
    </UseField>
  );
};
export const usePhaseTimings = () => {
  const ctx = useContext(PhaseTimingsContext);
  if (!ctx) throw new Error('Cannot use phase timings outside of phase timings context');

  return ctx;
};
