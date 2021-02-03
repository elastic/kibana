/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, memo } from 'react';
import {
  EuiIcon,
  EuiIconProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';

import { PhasesExceptDelete } from '../../../../../../common/types';

import {
  calculateRelativeFromAbsoluteMilliseconds,
  normalizeTimingsToHumanReadable,
  PhaseAgeInMilliseconds,
  AbsoluteTimings,
} from '../../lib';

import './timeline.scss';
import { InfinityIconSvg } from './infinity_icon.svg';
import { TimelinePhaseText } from './components';

const exists = (v: unknown) => v != null;

const InfinityIcon: FunctionComponent<Omit<EuiIconProps, 'type'>> = (props) => (
  <EuiIcon type={InfinityIconSvg} {...props} />
);

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

/**
 * Each phase, if active, should have a minimum width it occupies. The higher this
 * base amount, the smaller the variance in phase size in the timeline. This functions
 * as a min-width constraint.
 */
const SCORE_BUFFER_AMOUNT = 50;

const i18nTexts = {
  hotPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.hotPhaseSectionTitle', {
    defaultMessage: 'Hot phase',
  }),
  rolloverTooltip: i18n.translate(
    'xpack.indexLifecycleMgmt.timeline.hotPhaseRolloverToolTipContent',
    {
      defaultMessage:
        'How long it takes to reach the rollover criteria in the hot phase can vary. Data moves to the next phase when the time since rollover reaches the minimum age.',
    }
  ),
  warmPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.warmPhaseSectionTitle', {
    defaultMessage: 'Warm phase',
  }),
  coldPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.coldPhaseSectionTitle', {
    defaultMessage: 'Cold phase',
  }),
  deleteIcon: {
    toolTipContent: i18n.translate('xpack.indexLifecycleMgmt.timeline.deleteIconToolTipContent', {
      defaultMessage: 'Policy deletes the index after lifecycle phases complete.',
    }),
  },
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

interface Props {
  hasDeletePhase: boolean;
  /**
   * For now we assume the hot phase does not have a min age
   */
  hotPhaseMinAge: undefined;
  isUsingRollover: boolean;
  warmPhaseMinAge?: string;
  coldPhaseMinAge?: string;
  deletePhaseMinAge?: string;
}

/**
 * Display a timeline given ILM policy phase information. This component is re-usable and memo-ized
 * and should not rely directly on any application-specific context.
 */
export const Timeline: FunctionComponent<Props> = memo(
  ({ hasDeletePhase, isUsingRollover, ...phasesMinAge }) => {
    const absoluteTimings: AbsoluteTimings = {
      hot: { min_age: phasesMinAge.hotPhaseMinAge },
      warm: phasesMinAge.warmPhaseMinAge ? { min_age: phasesMinAge.warmPhaseMinAge } : undefined,
      cold: phasesMinAge.coldPhaseMinAge ? { min_age: phasesMinAge.coldPhaseMinAge } : undefined,
      delete: phasesMinAge.deletePhaseMinAge
        ? { min_age: phasesMinAge.deletePhaseMinAge }
        : undefined,
    };

    const phaseAgeInMilliseconds = calculateRelativeFromAbsoluteMilliseconds(absoluteTimings);
    const humanReadableTimings = normalizeTimingsToHumanReadable(phaseAgeInMilliseconds);

    const widths = calculateWidths(phaseAgeInMilliseconds);

    const getDurationInPhaseContent = (phase: PhasesExceptDelete): string | React.ReactNode =>
      phaseAgeInMilliseconds.phases[phase] === Infinity ? (
        <InfinityIcon aria-label={humanReadableTimings[phase]} />
      ) : (
        humanReadableTimings[phase]
      );

    return (
      <EuiFlexGroup gutterSize="s" direction="column" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.indexLifecycleMgmt.timeline.title', {
                defaultMessage: 'Policy Timeline',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
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
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" responsive={false}>
              <EuiFlexItem>
                <div className="ilmTimeline__phasesContainer">
                  {/* These are the actual color bars for the timeline */}
                  <div
                    data-test-subj="ilmTimelineHotPhase"
                    className="ilmTimeline__phasesContainer__phase ilmTimeline__hotPhase"
                  >
                    <div className="ilmTimeline__colorBar ilmTimeline__hotPhase__colorBar" />
                    <TimelinePhaseText
                      phaseName={
                        isUsingRollover ? (
                          <>
                            {i18nTexts.hotPhase}
                            &nbsp;
                            <div
                              className="ilmTimeline__rolloverIcon"
                              data-test-subj="timelineHotPhaseRolloverToolTip"
                            >
                              <EuiIconTip type="iInCircle" content={i18nTexts.rolloverTooltip} />
                            </div>
                          </>
                        ) : (
                          i18nTexts.hotPhase
                        )
                      }
                      durationInPhase={getDurationInPhaseContent('hot')}
                    />
                  </div>
                  {exists(phaseAgeInMilliseconds.phases.warm) && (
                    <div
                      data-test-subj="ilmTimelineWarmPhase"
                      className="ilmTimeline__phasesContainer__phase ilmTimeline__warmPhase"
                    >
                      <div className="ilmTimeline__colorBar ilmTimeline__warmPhase__colorBar" />
                      <TimelinePhaseText
                        phaseName={i18nTexts.warmPhase}
                        durationInPhase={getDurationInPhaseContent('warm')}
                      />
                    </div>
                  )}
                  {exists(phaseAgeInMilliseconds.phases.cold) && (
                    <div
                      data-test-subj="ilmTimelineColdPhase"
                      className="ilmTimeline__phasesContainer__phase ilmTimeline__coldPhase"
                    >
                      <div className="ilmTimeline__colorBar ilmTimeline__coldPhase__colorBar" />
                      <TimelinePhaseText
                        phaseName={i18nTexts.coldPhase}
                        durationInPhase={getDurationInPhaseContent('cold')}
                      />
                    </div>
                  )}
                </div>
              </EuiFlexItem>
              {hasDeletePhase && (
                <EuiFlexItem grow={false}>
                  <div
                    data-test-subj="ilmTimelineDeletePhase"
                    className="ilmTimeline__deleteIconContainer"
                  >
                    <EuiIconTip type="trash" content={i18nTexts.deleteIcon.toolTipContent} />
                  </div>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
