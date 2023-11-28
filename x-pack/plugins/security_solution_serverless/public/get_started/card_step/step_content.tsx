/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme, useEuiShadow, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import type {
  CardId,
  CheckIfStepCompleted,
  SectionId,
  StepId,
  ToggleTaskCompleteStatus,
} from '../types';

const LEFT_CONTENT_PANEL_WIDTH = 486;
const RIGHT_CONTENT_PANEL_WIDTH = 510;
const RIGHT_CONTENT_HEIGHT = 270;
const RIGHT_CONTENT_WIDTH = 480;

const StepContentComponent = ({
  cardId,
  checkIfStepCompleted,
  description,
  hasStepContent,
  isExpandedStep,
  sectionId,
  splitPanel,
  stepId,
  toggleTaskCompleteStatus,
}: {
  cardId: CardId;
  checkIfStepCompleted?: CheckIfStepCompleted;
  description?: React.ReactNode[];
  hasStepContent: boolean;
  isExpandedStep: boolean;
  sectionId: SectionId;
  splitPanel?: React.ReactNode;
  stepId: StepId;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');

  useCheckStepCompleted({
    checkIfStepCompleted,
    toggleTaskCompleteStatus,
    stepId,
    cardId,
    sectionId,
  });

  return hasStepContent && isExpandedStep ? (
    <EuiFlexGroup
      color="plain"
      css={css`
        justify-content: space-between;
        margin-top: ${euiTheme.size.l};
        padding: ${euiTheme.size.l};
        transition: opacity ${euiTheme.animation.normal};
        overflow: hidden;
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      data-test-subj={`${stepId}-content`}
      direction="row"
      gutterSize="none"
    >
      {description && (
        <EuiFlexItem
          grow={false}
          css={css`
            padding: 0 ${euiTheme.size.l} 0 ${euiTheme.size.s};
            width: ${LEFT_CONTENT_PANEL_WIDTH}px;
          `}
        >
          <EuiText size="s">
            {description?.map((desc, index) => (
              <p
                data-test-subj={`${stepId}-description-${index}`}
                key={`${stepId}-description-${index}`}
                className="eui-displayBlock"
                css={css`
                  margin-bottom: ${euiTheme.base * 2}px;
                  margin-block-end: ${euiTheme.base * 2}px !important;
                  line-height: ${euiTheme.size.l};
                `}
              >
                {desc}
              </p>
            ))}
          </EuiText>
        </EuiFlexItem>
      )}
      {splitPanel && (
        <EuiFlexItem
          grow={false}
          data-test-subj="split-panel"
          css={css`
            padding: 0 6px 0 ${euiTheme.size.l};
            width: ${RIGHT_CONTENT_PANEL_WIDTH}px;
          `}
        >
          {splitPanel && (
            <div
              css={css`
                height: ${RIGHT_CONTENT_HEIGHT}px;
                width: ${RIGHT_CONTENT_WIDTH}px;
                border-radius: ${euiTheme.border.radius.medium};
                overflow: hidden;
                box-shadow: ${shadow};
              `}
            >
              {splitPanel}
            </div>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
};
export const StepContent = React.memo(StepContentComponent);
