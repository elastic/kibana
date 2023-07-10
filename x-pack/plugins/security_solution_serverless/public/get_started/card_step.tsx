/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiBadge,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';

import type { CardId, SectionId, Step, StepId } from './types';
import step from './images/step.svg';

const CardStepComponent: React.FC<{
  sectionId: SectionId;
  cardId: CardId;
  step: Step;
  onStepClicked: (params: { stepId: StepId; cardId: CardId; sectionId: SectionId }) => void;
  finishedStepsByCard: Set<StepId>;
}> = ({
  sectionId,
  cardId,
  step: { id: stepId, title, badges, description, splitPanel },
  onStepClicked,
  finishedStepsByCard = new Set(),
}) => {
  const [expandStep, setExpandStep] = useState(false);
  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();
      setExpandStep(!expandStep);
      onStepClicked({ stepId, cardId, sectionId });
    },
    [cardId, expandStep, onStepClicked, sectionId, stepId]
  );

  return (
    <EuiPanel color="plain" grow={false} hasShadow={false} borderRadius="none" paddingSize="l">
      <EuiFlexGroup
        gutterSize="s"
        css={css`
          cursor: pointer;
        `}
        onClick={toggleStep}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            data-test-subj={`${stepId}-icon`}
            type={finishedStepsByCard.has(stepId) ? 'checkInCircleFilled' : step}
            size="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <strong>
            {title}
            {badges.map((badge) => (
              <EuiBadge key={`${stepId}-badge-${badge.id}`} color="hollow">
                {badge.name}
              </EuiBadge>
            ))}
          </strong>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: end;
          `}
        >
          <EuiIcon size="s" type={expandStep ? 'arrowDown' : 'arrowRight'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {expandStep && (description || splitPanel) && (
        <EuiSplitPanel.Outer
          direction="row"
          color="plain"
          grow={false}
          hasShadow={false}
          borderRadius="none"
        >
          {description && (
            <EuiSplitPanel.Inner>
              <EuiSpacer size="s" />
              <EuiText size="s">
                {description?.map((desc, index) => (
                  <p key={`${stepId}-description-${index}`} className="eui-displayBlock">
                    {desc}
                  </p>
                ))}
              </EuiText>
            </EuiSplitPanel.Inner>
          )}
          {splitPanel && <EuiSplitPanel.Inner paddingSize="none">{splitPanel}</EuiSplitPanel.Inner>}
        </EuiSplitPanel.Outer>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
