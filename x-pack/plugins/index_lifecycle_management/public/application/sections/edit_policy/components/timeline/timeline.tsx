/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useMemo } from 'react';
import { EuiText, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFormData } from '../../../../../shared_imports';

import { FormInternal } from '../../types';

import {
  calculateRelativeTimingMs,
  normalizeTimingsToHumanReadable,
  PhaseAgeInMilliseconds,
} from '../../lib';

import './_timeline.scss';

const toPercent = (n: number, total: number) => (n / total) * 100;

const msTimeToOverallPercent = (ms: number, totalMs: number) => {
  if (!isFinite(ms)) {
    return 100;
  }
  if (totalMs === 0) {
    return 100;
  }
  return toPercent(ms, totalMs);
};

const SCORE_BUFFER_AMOUNT = 200;

const i18nTexts = {
  hotPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.hotPhaseSectionTitle', {
    defaultMessage: 'Hot phase',
  }),
  warmPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.warmPhaseSectionTitle', {
    defaultMessage: 'Warm phase',
  }),
  coldPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.coldPhaseSectionTitle', {
    defaultMessage: 'Cold phase',
  }),
};

const calculateWidths = (inputs: PhaseAgeInMilliseconds) => {
  const hotScore = msTimeToOverallPercent(inputs.phases.hot, inputs.total) + SCORE_BUFFER_AMOUNT;
  const warmScore =
    inputs.phases.warm != null
      ? msTimeToOverallPercent(inputs.phases.warm, inputs.total) + SCORE_BUFFER_AMOUNT
      : 0;
  const coldScore =
    inputs.phases.cold != null
      ? msTimeToOverallPercent(inputs.phases.cold, inputs.total) + SCORE_BUFFER_AMOUNT
      : 0;

  const totalScore = hotScore + warmScore + coldScore;
  return {
    hot: `${toPercent(hotScore, totalScore)}%`,
    warm: `${toPercent(warmScore, totalScore)}%`,
    cold: `${toPercent(coldScore, totalScore)}%`,
  };
};

const TimelinePhaseText: FunctionComponent<{
  phaseName: string;
  durationInPhase?: string;
}> = ({ phaseName, durationInPhase }) => (
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{phaseName}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText className="ilmTimeline__timelinePhaseText__durationText" size="s">
        {durationInPhase}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();

  const phaseTimingInMs = useMemo(() => {
    return calculateRelativeTimingMs(formData);
  }, [formData]);

  const humanReadableTimings = useMemo(() => normalizeTimingsToHumanReadable(phaseTimingInMs), [
    phaseTimingInMs,
  ]);

  const widths = calculateWidths(phaseTimingInMs);

  return (
    <div
      className="ilmTimeline"
      ref={(el) => {
        if (el) {
          el.style.setProperty('--ilm-timeline-hot-phase-width', widths.hot);
          el.style.setProperty('--ilm-timeline-warm-phase-width', widths.warm ?? null);
          el.style.setProperty('--ilm-timeline-cold-phase-width', widths.cold ?? null);
        }
      }}
    >
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <div className="ilmTimeline__phasesContainer">
            <div className="ilmTimeline__phasesContainer__phase ilmTimeline__hotPhase">
              <div className="ilmTimeline__colorBarCommon ilmTimeline__hotPhase__colorBar" />
              <TimelinePhaseText
                phaseName={i18nTexts.hotPhase}
                durationInPhase={humanReadableTimings.hot}
              />
            </div>
            {formData._meta?.warm.enabled && (
              <div className="ilmTimeline__phasesContainer__phase ilmTimeline__warmPhase">
                <div className="ilmTimeline__colorBarCommon ilmTimeline__warmPhase__colorBar" />
                <TimelinePhaseText
                  phaseName={i18nTexts.warmPhase}
                  durationInPhase={humanReadableTimings.warm}
                />
              </div>
            )}
            {formData._meta?.cold.enabled && (
              <div className="ilmTimeline__phasesContainer__phase ilmTimeline__coldPhase">
                <div className="ilmTimeline__colorBarCommon ilmTimeline__coldPhase__colorBar" />
                <TimelinePhaseText
                  phaseName={i18nTexts.coldPhase}
                  durationInPhase={humanReadableTimings.cold}
                />
              </div>
            )}
          </div>
        </EuiFlexItem>
        {formData._meta?.delete.enabled && (
          <EuiFlexItem grow={false}>
            <div className="ilmTimeline__deleteIconContainer">
              <EuiIcon type="trash" />
            </div>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {/* These are the actual color bars for the timeline */}
    </div>
  );
};
