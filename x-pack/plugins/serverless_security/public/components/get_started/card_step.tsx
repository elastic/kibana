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

const CardStepComponent: React.FC<{ step: Step }> = ({ step }) => {
  const [expandStep, setExpandStep] = useState(false);
  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();
      setExpandStep(!expandStep);
    },
    [expandStep]
  );
  return (
    <EuiPanel color="plain" grow={false} hasShadow={false} borderRadius="none" paddingSize="l">
      <EuiFlexGroup
        gutterSize="s"
        onClick={toggleStep}
        css={css`
          cursor: pointer;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon {...step.icon} />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <strong>
            {step.title}
            {step.badges.map((badge) => (
              <EuiBadge key={`${step.id}-badge-${badge.id}`} color="hollow">
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
      {expandStep && (step.description || step.splitPanel) && (
        <EuiSplitPanel.Outer
          direction="row"
          color="plain"
          grow={false}
          hasShadow={false}
          borderRadius="none"
        >
          {step.description && (
            <EuiSplitPanel.Inner>
              <EuiSpacer size="s" />
              <EuiText size="s">
                {step.description?.map((desc, index) => (
                  <p key={`${step.id}-description-${index}`} className="eui-displayBlock">
                    {desc}
                  </p>
                ))}
              </EuiText>
            </EuiSplitPanel.Inner>
          )}
          {step.splitPanel && <EuiSplitPanel.Inner>{step.splitPanel}</EuiSplitPanel.Inner>}
        </EuiSplitPanel.Outer>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
