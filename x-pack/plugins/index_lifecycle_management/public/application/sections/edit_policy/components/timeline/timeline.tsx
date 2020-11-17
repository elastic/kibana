/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';
import moment from 'moment';
import { flow } from 'fp-ts/lib/function';
import { EuiText, EuiTitle } from '@elastic/eui';

import { PhaseWithAllocation } from '../../../../../../common/types';
import { useFormData } from '../../../../../shared_imports';
import { FormInternal, DataTierAllocationType } from '../../types';
import { splitSizeAndUnits } from '../../../../lib/policies';

import './_timeline.scss';

interface TimelineInputs {
  warm?: {
    min_age: string;
    dataTierAllocationType: DataTierAllocationType;
  };
  cold?: {
    min_age: string;
    dataTierAllocationType: DataTierAllocationType;
  };
  delete?: {
    min_age: string;
  };
}

type Phase = 'warm' | 'cold' | 'delete';

const getMinAge = (phase: Phase, formData: FormInternal) => ({
  min_age: formData.phases[phase]?.min_age
    ? formData.phases[phase]!.min_age! + formData._meta[phase].minAgeUnit
    : '0ms',
});

const getMinAgeAndAllocation = (phase: PhaseWithAllocation, formData: FormInternal) => ({
  ...getMinAge(phase, formData),
  dataTierAllocationType: formData._meta.warm.dataTierAllocationType,
});

const formDataToTimelineInputs = (formData: FormInternal): TimelineInputs => {
  const { _meta } = formData;
  if (!_meta) {
    return {};
  }
  return {
    warm: _meta.warm.enabled ? getMinAgeAndAllocation('warm', formData) : undefined,
    cold: _meta.cold.enabled ? getMinAgeAndAllocation('cold', formData) : undefined,
    delete: _meta.delete.enabled ? getMinAge('delete', formData) : undefined,
  };
};

const getPhaseMinAgeInMilliseconds = (phase: { min_age: string }): number => {
  let milliseconds: number;
  const { units, size } = splitSizeAndUnits(phase.min_age);
  if (units === 'micros') {
    milliseconds = parseInt(size, 10) * 1e3;
  } else if (units === 'nanos') {
    milliseconds = parseInt(size, 10) * 1e6;
  } else {
    milliseconds = moment.duration(size, units as any).asMilliseconds();
  }
  return milliseconds;
};

const toPercent = (value: number, total: number) => (value / total) * 100;

const phasesMaps: Array<{ minAgeFor: Phase; maxAgeFor: 'hot' | 'warm' | 'cold' }> = [
  { minAgeFor: 'warm', maxAgeFor: 'hot' },
  { minAgeFor: 'cold', maxAgeFor: 'warm' },
  { minAgeFor: 'delete', maxAgeFor: 'cold' },
];

type PhaseWidths = [hotPhase: number, warmPhase?: number, coldPhase?: number];

const calculateWidths = (inputs: TimelineInputs): PhaseWidths => {
  const { total, phases } = phasesMaps.reduce(
    (acc, phaseMap) => {
      const phase = inputs[phaseMap.minAgeFor];
      if (phase) {
        const phaseMinAge = getPhaseMinAgeInMilliseconds(phase);
        return {
          total: acc.total + phaseMinAge,
          phases: {
            ...acc.phases,
            [phaseMap.maxAgeFor]: Math.max(phaseMinAge - acc.total, 0),
          },
        };
      }
      return acc;
    },
    {
      total: 0,
      phases: {
        hot: 0,
        warm: inputs.warm ? 0 : undefined,
        cold: inputs.cold ? 0 : undefined,
      },
    }
  );

  if (total === 0) {
    return [100];
  }

  return [
    toPercent(phases.hot, total),
    phases.warm && toPercent(phases.warm, total),
    phases.cold && toPercent(phases.cold, total),
  ];
};

const MIN_WIDTH_BUFFER = 100;
const normalizeToPercentageWidths = (
  widths: PhaseWidths
): [hotPhase: string, warmPhase?: string, coldPhase?: string] => {
  const total =
    widths.reduce<number>((acc, w) => (w ?? 0) + acc, 0) + widths.length * MIN_WIDTH_BUFFER;

  return widths.flatMap((w) => {
    return typeof w === 'number' ? [`${((w + MIN_WIDTH_BUFFER) / total) * 100}%`] : [];
  }) as any;
};

const calculateWidthsFromFormData = flow(
  formDataToTimelineInputs,
  calculateWidths,
  normalizeToPercentageWidths
);

/**
 * This component calculates not-to-scale percentages so that phases with
 * a higher minimum age values are not displayed to scale. For instance, a min age
 * configuration in seconds would be totally dwarfed by min age setting in days which
 * would not be a useful UI for this timeline.
 */
export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();

  const [hotWidth, warmWidth, coldWidth] = useMemo(() => calculateWidthsFromFormData(formData), [
    formData,
  ]);

  return (
    <div
      className="ilmTimeline"
      ref={(el) => {
        if (el) {
          el.style.setProperty('--ilm-hot-phase-width', hotWidth);
          el.style.setProperty('--ilm-warm-phase-width', warmWidth ?? null);
          el.style.setProperty('--ilm-cold-phase-width', coldWidth ?? null);
        }
      }}
    >
      <div>
        <EuiTitle size="s">
          <h3>
            <strong>Policy Summary</strong>
          </h3>
        </EuiTitle>
      </div>
      <div className="ilmTimeline__phase ilmTimeline__hotPhase">
        <div className="ilmTimeline__hotPhase__colorBar" />
        <EuiText size="s">Hot phase</EuiText>
      </div>
      <div className="ilmTimeline__phase ilmTimeline__warmPhase">
        <div className="ilmTimeline__warmPhase__colorBar" />
        <EuiText size="s">Warm phase</EuiText>
      </div>
      <div className="ilmTimeline__phase ilmTimeline__coldPhase">
        <div className="ilmTimeline__coldPhase__colorBar" />
        <EuiText size="s">Cold phase</EuiText>
      </div>
    </div>
  );
};
