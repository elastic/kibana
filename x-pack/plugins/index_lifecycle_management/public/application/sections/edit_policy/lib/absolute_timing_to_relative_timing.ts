/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * READ ME:
 *
 * ILM policies express data age thresholds as minimum age from an absolute point of reference.
 * The absolute point of reference could be when data was created, but it could also be when
 * rollover has occurred. This is useful for configuring a policy, but when trying to understand
 * how long data will be in a specific phase, when thinking of data tiers, it is not as useful.
 *
 * This code converts the absolute timings to _relative_ timings of the form: 30 days in hot phase,
 * 40 days in warm phase then forever in cold phase.
 */

import moment from 'moment';
import { flow } from 'fp-ts/lib/function';
import { i18n } from '@kbn/i18n';

import { splitSizeAndUnits } from '../../../lib/policies';

import { FormInternal } from '../types';

type MinAgePhase = 'warm' | 'cold' | 'delete';

type Phase = 'hot' | MinAgePhase;

const i18nTexts = {
  forever: i18n.translate('xpack.indexLifecycleMgmt.relativeTiming.Forever', {
    defaultMessage: 'Forever',
  }),
  lessThanADay: i18n.translate('xpack.indexLifecycleMgmt.relativeTiming.lessThanADay', {
    defaultMessage: 'Less than a day',
  }),
  day: i18n.translate('xpack.indexLifecycleMgmt.relativeTiming.day', {
    defaultMessage: 'day',
  }),
  days: i18n.translate('xpack.indexLifecycleMgmt.relativeTiming.days', {
    defaultMessage: 'days',
  }),
};

interface AbsoluteTimings {
  hot: {
    min_age: undefined;
  };
  warm?: {
    min_age: string;
  };
  cold?: {
    min_age: string;
  };
  delete?: {
    min_age: string;
  };
}

export interface PhaseAgeInMilliseconds {
  total: number;
  phases: {
    hot: number;
    warm?: number;
    cold?: number;
  };
}

const phaseOrder: Phase[] = ['hot', 'warm', 'cold', 'delete'];

const getMinAge = (phase: MinAgePhase, formData: FormInternal) => ({
  min_age: formData.phases[phase]?.min_age
    ? formData.phases[phase]!.min_age! + formData._meta[phase].minAgeUnit
    : '0ms',
});

const formDataToAbsoluteTimings = (formData: FormInternal): AbsoluteTimings => {
  const { _meta } = formData;
  if (!_meta) {
    return { hot: { min_age: undefined } };
  }
  return {
    hot: { min_age: undefined },
    warm: _meta.warm.enabled ? getMinAge('warm', formData) : undefined,
    cold: _meta.cold.enabled ? getMinAge('cold', formData) : undefined,
    delete: _meta.delete.enabled ? getMinAge('delete', formData) : undefined,
  };
};

/**
 * See https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math
 * for all date math values. ILM policies also support "micros" and "nanos".
 */
const getPhaseMinAgeInMilliseconds = (phase: { min_age: string }): number => {
  let milliseconds: number;
  const { units, size } = splitSizeAndUnits(phase.min_age);
  if (units === 'micros') {
    milliseconds = parseInt(size, 10) / 1e3;
  } else if (units === 'nanos') {
    milliseconds = parseInt(size, 10) / 1e6;
  } else {
    milliseconds = moment.duration(size, units as any).asMilliseconds();
  }
  return milliseconds;
};

/**
 * Given a set of phase minimum age absolute timings, like hot phase 0ms and warm phase 3d, work out
 * the number of milliseconds data will reside in phase.
 */
const calculateMilliseconds = (inputs: AbsoluteTimings): PhaseAgeInMilliseconds => {
  return phaseOrder.reduce<PhaseAgeInMilliseconds>(
    (acc, phaseName, idx) => {
      // Delete does not have an age associated with it
      if (phaseName === 'delete') {
        return acc;
      }
      const phase = inputs[phaseName];
      if (!phase) {
        return acc;
      }
      const nextPhase = phaseOrder
        .slice(idx + 1)
        .find((nextPhaseName) => Boolean(inputs[nextPhaseName])); // find the next existing phase

      let nextPhaseMinAge = Infinity;

      // If we have a next phase, calculate the timing between this phase and the next
      if (nextPhase && inputs[nextPhase]?.min_age) {
        nextPhaseMinAge = getPhaseMinAgeInMilliseconds(inputs[nextPhase] as { min_age: string });
      }

      return {
        // data will be the age of the phase with the highest min age requirement
        total: Math.max(acc.total, nextPhaseMinAge),
        phases: {
          ...acc.phases,
          [phaseName]: Math.max(nextPhaseMinAge - acc.total, 0), // get the max age for the current phase, take 0 if negative number
        },
      };
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
};

const millisecondsToDays = (milliseconds?: number): string | undefined => {
  if (milliseconds == null) {
    return;
  }
  if (!isFinite(milliseconds)) {
    return i18nTexts.forever;
  }
  const days = milliseconds / 8.64e7;
  return days < 1
    ? i18nTexts.lessThanADay
    : `${Math.floor(days)} ${days === 1 ? i18nTexts.day : i18nTexts.days}`;
};

export const normalizeTimingsToHumanReadable = ({
  total,
  phases,
}: PhaseAgeInMilliseconds): { total?: string; hot?: string; warm?: string; cold?: string } => {
  return {
    total: millisecondsToDays(total),
    hot: millisecondsToDays(phases.hot),
    warm: millisecondsToDays(phases.warm),
    cold: millisecondsToDays(phases.cold),
  };
};

export const calculateRelativeTimingMs = flow(formDataToAbsoluteTimings, calculateMilliseconds);

export const absoluteTimingToRelativeTiming = flow(
  formDataToAbsoluteTimings,
  calculateMilliseconds,
  normalizeTimingsToHumanReadable
);
