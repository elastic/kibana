/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import React, { FunctionComponent, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiIconTip } from '@elastic/eui';

import { useKibana } from '../../../../../shared_imports';

import { PhaseExceptDelete } from '../../../../../../common/types';

import {
  calculateRelativeFromAbsoluteMilliseconds,
  PhaseAgeInMilliseconds,
  AbsoluteTimings,
} from '../../lib';

import { InfinityIcon, LearnMoreLink } from '..';

import { TimelinePhaseText } from './components';

const exists = (v: unknown) => v != null;

import './timeline.scss';

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
  title: i18n.translate('xpack.indexLifecycleMgmt.timeline.title', {
    defaultMessage: 'Policy summary',
  }),
  description: i18n.translate('xpack.indexLifecycleMgmt.timeline.description', {
    defaultMessage: 'This policy moves data through the following phases.',
  }),
  hotPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.hotPhaseSectionTitle', {
    defaultMessage: 'Hot phase',
  }),
  warmPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.warmPhaseSectionTitle', {
    defaultMessage: 'Warm phase',
  }),
  coldPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.coldPhaseSectionTitle', {
    defaultMessage: 'Cold phase',
  }),
  frozenPhase: i18n.translate('xpack.indexLifecycleMgmt.timeline.frozenPhaseSectionTitle', {
    defaultMessage: 'Frozen phase',
  }),
  deleteIcon: {
    toolTipContent: i18n.translate('xpack.indexLifecycleMgmt.timeline.deleteIconToolTipContent', {
      defaultMessage: 'Policy deletes the index after lifecycle phases complete.',
    }),
  },
  foreverIcon: {
    ariaLabel: i18n.translate('xpack.indexLifecycleMgmt.timeline.foreverIconToolTipContent', {
      defaultMessage: 'Forever',
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
  const frozenScore =
    inputs.phases.frozen != null
      ? msTimeToOverallPercent(inputs.phases.frozen, inputs.total) + SCORE_BUFFER_AMOUNT
      : 0;

  const totalScore = hotScore + warmScore + coldScore + frozenScore;
  return {
    hot: `${toPercent(hotScore, totalScore)}%`,
    warm: `${toPercent(warmScore, totalScore)}%`,
    cold: `${toPercent(coldScore, totalScore)}%`,
    frozen: `${toPercent(frozenScore, totalScore)}%`,
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
  frozenPhaseMinAge?: string;
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
      frozen: phasesMinAge.frozenPhaseMinAge
        ? { min_age: phasesMinAge.frozenPhaseMinAge }
        : undefined,
      delete: phasesMinAge.deletePhaseMinAge
        ? { min_age: phasesMinAge.deletePhaseMinAge }
        : undefined,
    };

    const phaseAgeInMilliseconds = calculateRelativeFromAbsoluteMilliseconds(absoluteTimings);

    const widths = calculateWidths(phaseAgeInMilliseconds);

    const getDurationInPhaseContent = (phase: PhaseExceptDelete): string | React.ReactNode =>
      phaseAgeInMilliseconds.phases[phase] === Infinity ? (
        <InfinityIcon color="subdued" aria-label={i18nTexts.foreverIcon.ariaLabel} />
      ) : null;

    const { docLinks } = useKibana().services;

    return (
      <EuiFlexGroup gutterSize="s" direction="column" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18nTexts.title}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18nTexts.description}
            &nbsp;
            <LearnMoreLink
              docPath={docLinks.links.elasticsearch.ilmPhaseTransitions}
              text={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.learnAboutTimingText"
                  defaultMessage="Learn about timing"
                />
              }
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <div
            className="ilmTimeline"
            ref={(el) => {
              if (el) {
                el.style.setProperty('--ilm-timeline-hot-phase-width', widths.hot);
                el.style.setProperty('--ilm-timeline-warm-phase-width', widths.warm ?? null);
                el.style.setProperty('--ilm-timeline-cold-phase-width', widths.cold ?? null);
                el.style.setProperty('--ilm-timeline-frozen-phase-width', widths.frozen ?? null);
              }
            }}
          >
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" responsive={false}>
              <EuiFlexItem>
                <div className="ilmTimeline__phasesContainer">
                  {/* These are the actual color bars for the timeline */}
                  <div
                    data-test-subj="ilmTimelinePhase-hot"
                    className="ilmTimeline__phasesContainer__phase ilmTimeline__hotPhase"
                  >
                    <div className="ilmTimeline__colorBar ilmTimeline__hotPhase__colorBar" />
                    <TimelinePhaseText
                      phaseName={i18nTexts.hotPhase}
                      durationInPhase={getDurationInPhaseContent('hot')}
                    />
                  </div>
                  {exists(phaseAgeInMilliseconds.phases.warm) && (
                    <div
                      data-test-subj="ilmTimelinePhase-warm"
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
                      data-test-subj="ilmTimelinePhase-cold"
                      className="ilmTimeline__phasesContainer__phase ilmTimeline__coldPhase"
                    >
                      <div className="ilmTimeline__colorBar ilmTimeline__coldPhase__colorBar" />
                      <TimelinePhaseText
                        phaseName={i18nTexts.coldPhase}
                        durationInPhase={getDurationInPhaseContent('cold')}
                      />
                    </div>
                  )}
                  {exists(phaseAgeInMilliseconds.phases.frozen) && (
                    <div
                      data-test-subj="ilmTimelinePhase-frozen"
                      className="ilmTimeline__phasesContainer__phase ilmTimeline__frozenPhase"
                    >
                      <div className="ilmTimeline__colorBar ilmTimeline__frozenPhase__colorBar" />
                      <TimelinePhaseText
                        phaseName={i18nTexts.frozenPhase}
                        durationInPhase={getDurationInPhaseContent('frozen')}
                      />
                    </div>
                  )}
                </div>
              </EuiFlexItem>
              {hasDeletePhase && (
                <EuiFlexItem grow={false}>
                  <div
                    data-test-subj="ilmTimelinePhase-delete"
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
