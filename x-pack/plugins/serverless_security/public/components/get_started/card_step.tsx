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

import { Step } from './types';
import step from './images/step.svg';

const CardStepComponent: React.FC<{
  cardId: string;
  step: Step;
  onStepClicked: (params: { stepId: string; cardId: string }) => void;
  finishedStepsByCard: Set<string>;
}> = ({
  cardId,
  step: { id, title, badges, description, splitPanel },
  onStepClicked,
  finishedStepsByCard,
}) => {
  const [expandStep, setExpandStep] = useState(false);
  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();
      setExpandStep(!expandStep);
      onStepClicked({ stepId: id, cardId });
    },
    [cardId, expandStep, id, onStepClicked]
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
          <EuiIcon type={finishedStepsByCard.has(id) ? 'checkInCircleFilled' : step} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <strong>
            {title}
            {badges.map((badge) => (
              <EuiBadge key={`${id}-badge-${badge.id}`} color="hollow">
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
                  <p key={`${id}-description-${index}`} className="eui-displayBlock">
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
