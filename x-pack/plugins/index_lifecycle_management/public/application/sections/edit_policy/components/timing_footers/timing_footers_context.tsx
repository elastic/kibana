/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, FunctionComponent, ReactNode, useContext, useMemo } from 'react';
import { UseField, useFormData } from '../../../../../shared_imports';
import { FormInternal } from '../../types';
import {
  calculateRelativeFromAbsoluteMilliseconds,
  formDataToAbsoluteTimings,
  normalizeTimingsToHumanReadable,
  PhaseAgeInMilliseconds,
} from '../../lib';
import { TimingFooter } from './timing_footer';

type Phase = 'hot' | 'warm' | 'cold';

const isLastActivePhase = (phaseTimings: PhaseAgeInMilliseconds, phase: Phase) => {
  // cold is always last phase
  if (phase === 'cold') return true;
  // warm is last only if infinity timing or set timing without cold phase
  if (phase === 'warm') {
    return phaseTimings.phases[phase] === Infinity || phaseTimings.phases.cold === undefined;
  }
  // hot is last only if infinity timing or set timing without warm and cold phase
  return (
    phaseTimings.phases[phase] === Infinity ||
    (phaseTimings.phases.warm === undefined && phaseTimings.phases.cold === undefined)
  );
};
export interface TimingFooters {
  hot: ReactNode;
  warm: ReactNode;
  cold: ReactNode;
  setDeletePhaseEnabled: (value: boolean) => void;
}

const TimingFootersContext = createContext<TimingFooters>(null as any);

export const TimingFootersProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData<FormInternal>();

  const absoluteTimings = useMemo(() => {
    return formDataToAbsoluteTimings(formData);
  }, [formData]);

  const phaseTimings = calculateRelativeFromAbsoluteMilliseconds(absoluteTimings);
  const humanReadableTimings = useMemo(() => normalizeTimingsToHumanReadable(phaseTimings), [
    phaseTimings,
  ]);

  const createPhaseTimingFooter = (phase: Phase, setValue: (value: boolean) => void) => (
    <TimingFooter
      timingInMs={phaseTimings.phases[phase]}
      timingLabel={humanReadableTimings[phase]}
      isLastActivePhase={isLastActivePhase(phaseTimings, phase)}
      setValue={setValue}
    />
  );

  return (
    <UseField path={'_meta.delete.enabled'}>
      {(field) => {
        return (
          <>
            <TimingFootersContext.Provider
              value={{
                hot: createPhaseTimingFooter('hot', field.setValue),
                warm: createPhaseTimingFooter('warm', field.setValue),
                cold: createPhaseTimingFooter('cold', field.setValue),
                setDeletePhaseEnabled: field.setValue,
              }}
            >
              {children}
            </TimingFootersContext.Provider>
          </>
        );
      }}
    </UseField>
  );
};

export const useTimingFooters = () => {
  const ctx = useContext(TimingFootersContext);
  if (!ctx) throw new Error('Cannot use timing footers outside of timing footers context');

  return ctx;
};
