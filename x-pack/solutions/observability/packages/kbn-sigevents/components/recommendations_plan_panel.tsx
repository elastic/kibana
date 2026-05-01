/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps, EuiIconProps } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DevModePlaceholder } from './dev_mode_placeholder';

export interface RecommendationStep {
  id: string;
  title: string;
  description?: string;
}

export interface RecommendationsPlanPanelProps {
  steps?: RecommendationStep[];
  escalateBadgeLabel?: string;
  escalateBadgeColor?: EuiBadgeProps['color'];
  escalateBadgeIconType?: EuiIconProps['type'];
  initialOpenStepIds?: string[];
  initialDetailsOpen?: boolean;
  onRemediate?: () => void;
  onOpenDetails?: (isOpen: boolean) => void;
}

const DEFAULT_STEPS: RecommendationStep[] = [
  {
    id: '1',
    title: 'Monitoring order-flow signal volumes',
    description:
      'Continue monitoring order-flow signal volumes for sustained elevation that could indicate load-related degradation or upstream traffic anomalies.',
  },
  {
    id: '2',
    title: 'Checkout service verification',
    description:
      'Verify the checkout service (blast_radius confirmed) is handling the elevated transaction volume without latency degradation or error rate increases.',
  },
];

const generateAccordionId = htmlIdGenerator('recommendationsPlanStep');

export function RecommendationsPlanPanel(props: RecommendationsPlanPanelProps) {
  const {
    steps = DEFAULT_STEPS,
    escalateBadgeLabel,
    escalateBadgeColor = 'warning',
    escalateBadgeIconType = 'warning',
    initialOpenStepIds,
    initialDetailsOpen = false,
    onRemediate,
    onOpenDetails,
  } = props;

  const hasPlaceholderData = props.steps === undefined;

  const { euiTheme } = useEuiTheme();

  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(initialDetailsOpen);
  const [openStepIds, setOpenStepIds] = useState<Set<string>>(
    () => new Set(initialOpenStepIds ?? steps.map((step) => step.id))
  );

  const toggleDetails = () => {
    setIsDetailsOpen((prev) => {
      const next = !prev;
      onOpenDetails?.(next);
      return next;
    });
  };

  const toggleStep = (id: string) => {
    setOpenStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const panelCss = css`
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
  `;

  const headerStripCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.base};
    border-bottom: ${euiTheme.border.thin};
  `;

  const titleCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const stepRowCss = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
  `;

  const stepDescriptionCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: 8px;
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    margin-top: ${euiTheme.size.xs};
    font-family: ${euiTheme.font.familyCode};
    font-size: ${euiTheme.size.m};
    line-height: ${euiTheme.size.l};
    color: ${euiTheme.colors.textSubdued};
  `;

  const footerCss = css`
    padding: ${euiTheme.size.base};
  `;

  const escalateLabel =
    escalateBadgeLabel ??
    i18n.translate('xpack.observability.sigeventsOverview.recommendationsPlan.escalateBadge', {
      defaultMessage: 'Escalate',
    });

  const openDetailsLabel = i18n.translate(
    'xpack.observability.sigeventsOverview.recommendationsPlan.openDetails',
    { defaultMessage: 'Open details' }
  );

  const closeDetailsLabel = i18n.translate(
    'xpack.observability.sigeventsOverview.recommendationsPlan.closeDetails',
    { defaultMessage: 'Close details' }
  );

  const remediateLabel = i18n.translate(
    'xpack.observability.sigeventsOverview.recommendationsPlan.remediateWithAgentBuilder',
    { defaultMessage: 'Remediate with Agent Builder' }
  );

  const stepMoreActionsAria = i18n.translate(
    'xpack.observability.sigeventsOverview.recommendationsPlan.stepMoreActionsAria',
    { defaultMessage: 'More actions for this step' }
  );

  return (
    <DevModePlaceholder hasPlaceholderData={hasPlaceholderData}>
      <EuiPanel hasBorder css={panelCss} data-test-subj="sigeventsOverviewRecommendationsPlanPanel">
        <div css={headerStripCss}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" css={titleCss}>
                    {i18n.translate(
                      'xpack.observability.sigeventsOverview.recommendationsPlan.title',
                      { defaultMessage: 'Recommendations plan' }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={escalateBadgeColor}
                    iconType={escalateBadgeIconType}
                    data-test-subj="sigeventsOverviewRecommendationsPlanEscalateBadge"
                  >
                    {escalateLabel}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="sigeventsOverviewRecommendationsPlanOpenDetails"
                size="s"
                color="text"
                iconType={isDetailsOpen ? 'arrowUp' : 'arrowDown'}
                iconSide="right"
                onClick={toggleDetails}
                aria-expanded={isDetailsOpen}
              >
                {isDetailsOpen ? closeDetailsLabel : openDetailsLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiText size="s">
            <p
              css={css`
                margin-bottom: 0;
              `}
            >
              <FormattedMessage
                id="xpack.observability.sigeventsOverview.recommendationsPlan.summary"
                defaultMessage="We recommend a {stepPlan} to understand what the remediation of this might be."
                values={{
                  stepPlan: (
                    <strong>
                      <FormattedMessage
                        id="xpack.observability.sigeventsOverview.recommendationsPlan.summaryStepPlan"
                        defaultMessage="{stepCount, plural, one {# step plan} other {# step plan}}"
                        values={{ stepCount: steps.length }}
                      />
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiText>
        </div>

        {isDetailsOpen
          ? steps.map((step) => {
              const isOpen = openStepIds.has(step.id);
              const accordionId = generateAccordionId(step.id);

              return (
                <div
                  key={step.id}
                  css={stepRowCss}
                  data-test-subj={`sigeventsOverviewRecommendationsPlanStep-${step.id}`}
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={true}>
                      <EuiAccordion
                        id={accordionId}
                        forceState={isOpen ? 'open' : 'closed'}
                        onToggle={() => toggleStep(step.id)}
                        paddingSize="none"
                        buttonProps={{
                          'data-test-subj': `sigeventsOverviewRecommendationsPlanStepToggle-${step.id}`,
                        }}
                        buttonContent={
                          <EuiText size="xs">
                            <span css={titleCss}>{step.title}</span>
                          </EuiText>
                        }
                      >
                        {step.description ? (
                          <div css={stepDescriptionCss}>{step.description}</div>
                        ) : null}
                      </EuiAccordion>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        display="empty"
                        size="xs"
                        color="text"
                        aria-label={stepMoreActionsAria}
                        data-test-subj={`sigeventsOverviewRecommendationsPlanStepMore-${step.id}`}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              );
            })
          : null}

        <div css={footerCss}>
          <AiButton
            data-test-subj="sigeventsOverviewRecommendationsPlanRemediate"
            size="s"
            iconType="productAgent"
            onClick={onRemediate}
          >
            {remediateLabel}
          </AiButton>
        </div>
      </EuiPanel>
    </DevModePlaceholder>
  );
}
