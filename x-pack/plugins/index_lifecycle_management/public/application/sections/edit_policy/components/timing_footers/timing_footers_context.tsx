/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, FunctionComponent, ReactNode, useContext, useMemo } from 'react';
import { UseField, useFormData } from '../../../../../shared_imports';
import { FormInternal } from '../../types';
import { calculateRelativeTimingMs, normalizeTimingsToHumanReadable } from '../../lib';
import { TimingFooter } from './timing_footer';

export interface TimingFooters {
  hot: ReactNode;
  warm: ReactNode;
  cold: ReactNode;
  setDeletePhaseEnabled: (value: boolean) => void;
}

const TimingFootersContext = createContext<TimingFooters>(null as any);

export const TimingFootersProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData<FormInternal>();

  const phaseTimings = useMemo(() => {
    return calculateRelativeTimingMs(formData);
  }, [formData]);

  const humanReadableTimings = useMemo(() => normalizeTimingsToHumanReadable(phaseTimings), [
    phaseTimings,
  ]);

  const createPhaseTimingFooter = (
    phase: 'hot' | 'warm' | 'cold',
    setValue: (value: boolean) => void
  ) => (
    <TimingFooter
      timingInMs={phaseTimings.phases[phase]}
      timingLabel={humanReadableTimings[phase]}
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
