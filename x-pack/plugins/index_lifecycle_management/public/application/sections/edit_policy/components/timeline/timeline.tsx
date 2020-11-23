/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useMemo } from 'react';
import moment from 'moment';
import { flow } from 'fp-ts/lib/function';
import { EuiText, EuiTitle } from '@elastic/eui';

import { PhaseWithAllocation } from '../../../../../../common/types';
import { useFormData } from '../../../../../shared_imports';
import { FormInternal, DataTierAllocationType } from '../../types';
import { splitSizeAndUnits } from '../../../../lib/policies';

import './_timeline.scss';

type MinAgePhase = 'warm' | 'cold' | 'delete';
type Phase = 'hot' | MinAgePhase;
const phaseOrder: Phase[] = ['hot', 'warm', 'cold', 'delete'];
type TimelineInputs = [
  hotPhase: {
    min_age: undefined;
    dataTierAllocationType: 'node_role';
  },
  warmPhase?: {
    min_age: string;
    dataTierAllocationType: DataTierAllocationType;
  },
  coldPhase?: {
    min_age: string;
    dataTierAllocationType: DataTierAllocationType;
  },
  deletePhase?: {
    min_age: string;
  }
];

const getMinAge = (phase: MinAgePhase, formData: FormInternal) => ({
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
    return [{ dataTierAllocationType: 'node_role', min_age: undefined }];
  }
  return [
    { dataTierAllocationType: 'node_role', min_age: undefined },
    _meta.warm.enabled ? getMinAgeAndAllocation('warm', formData) : undefined,
    _meta.cold.enabled ? getMinAgeAndAllocation('cold', formData) : undefined,
    _meta.delete.enabled ? getMinAge('delete', formData) : undefined,
  ];
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

type PhasesInMilliseconds = [hotPhase: number, warmPhase?: number, coldPhase?: number];

const calculateMilliseconds = (inputs: TimelineInputs): PhasesInMilliseconds => {
  const { total, phases } = inputs.reduce(
    (acc, phase, idx) => {
      if (!phase) {
        return acc;
      }
      const nextPhase = inputs.slice(idx + 1).find(Boolean); // find the first existing next phase
      const nextPhaseMinAge =
        nextPhase?.min_age != null ? getPhaseMinAgeInMilliseconds(nextPhase) : Infinity;
      return {
        total: acc.total + nextPhaseMinAge,
        phases: {
          ...acc.phases,
          [phaseOrder[idx]]: Math.max(nextPhaseMinAge - acc.total, 0), // get the max age for the current phase
        },
      };
    },
    {
      total: 0,
      phases: {
        hot: 0,
        warm: inputs[1] ? 0 : undefined,
        cold: inputs[2] ? 0 : undefined,
      },
    }
  );

  if (total === 0) {
    return [Infinity /* Hot always! */];
  }
  return [phases.hot, phases.warm, phases.cold];
};

const millisecondsToDays = (milliseconds?: number): string | undefined => {
  if (milliseconds == null) {
    return;
  }
  if (!isFinite(milliseconds)) {
    return 'Forever';
  }
  const days = milliseconds / 8.64e7;
  return days < 1
    ? 'Less than a day'
    : `At least ${Math.floor(days)} ${days === 1 ? 'day' : 'days'}`;
};

const normalizeTimingsToHumanReadable = ([hot, warm, cold]: PhasesInMilliseconds) => {
  return [millisecondsToDays(hot), millisecondsToDays(warm), millisecondsToDays(cold)];
};

const normalizeToMaxAge = flow(calculateMilliseconds, normalizeTimingsToHumanReadable);

const calculateWidths = (inputs: TimelineInputs) =>
  `${(1 / inputs.filter(Boolean).length ?? 1) * 100}%`;

/**
 * This component calculates not-to-scale percentages so that phases with
 * a higher minimum age values are not displayed to scale. For instance, a min age
 * configuration in seconds would be totally dwarfed by min age setting in days which
 * would not be a useful UI for this timeline.
 */
export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();

  const timelineInputs = useMemo(() => {
    return formDataToTimelineInputs(formData);
  }, [formData]);

  const [hotDays, warmDays, coldDays] = useMemo(() => normalizeToMaxAge(timelineInputs), [
    timelineInputs,
  ]);

  const width = calculateWidths(timelineInputs);

  return (
    <div
      className="ilmTimeline"
      ref={(el) => {
        if (el) {
          el.style.setProperty('--ilm-phase-width', width);
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
        <EuiText size="s">Hot phase: {hotDays}</EuiText>
      </div>
      {formData._meta?.warm.enabled && (
        <div className="ilmTimeline__phase ilmTimeline__warmPhase">
          <div className="ilmTimeline__warmPhase__colorBar" />
          <EuiText size="s">Warm phase: {warmDays}</EuiText>
        </div>
      )}
      {formData._meta?.cold.enabled && (
        <div className="ilmTimeline__phase ilmTimeline__coldPhase">
          <div className="ilmTimeline__coldPhase__colorBar" />
          <EuiText size="s">Cold phase: {coldDays}</EuiText>
        </div>
      )}
      {formData._meta?.delete.enabled && (
        <div className="ilmTimeline__phase ilmTimeline__deletePhase">
          <div className="ilmTimeline__deletePhase__colorBar" />
          <EuiText size="s">Delete phase</EuiText>
        </div>
      )}
    </div>
  );
};
