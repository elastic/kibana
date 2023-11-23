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
  useEuiTheme,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import classnames from 'classnames';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { CardId, OnStepClicked, OnStepButtonClicked, SectionId, StepId } from '../types';
import icon_cross from '../images/icon_cross.svg';
import {
  UNDO_MARK_AS_DONE_TITLE,
  MARK_AS_DONE_TITLE,
  ALL_DONE_TEXT,
  COLLAPSE_STEP_BUTTON_LABEL,
  EXPAND_STEP_BUTTON_LABEL,
} from '../translations';
import { getStepsByActiveProduct, isDefaultFinishedCardStep } from '../helpers';
import type { ProductLine } from '../../../common/product';

import { StepContent } from './step_content';
import { useKibana } from '../../common/services';

const CardStepComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  cardId: CardId;
  expandedSteps: Set<StepId>;
  finishedSteps: Set<StepId>;
  isExpandedCard: boolean;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  stepId: StepId;
}> = ({
  activeProducts,
  cardId,
  expandedSteps,
  finishedSteps = new Set(),
  isExpandedCard,
  onStepButtonClicked,
  onStepClicked,
  sectionId,
  stepId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToApp } = useKibana().services.application;
  const isExpandedStep = expandedSteps.has(stepId);
  const steps = useMemo(
    () => getStepsByActiveProduct({ activeProducts, cardId, sectionId }),
    [activeProducts, cardId, sectionId]
  );
  const { title, description, splitPanel, icon } = steps?.find((step) => step.id === stepId) ?? {};
  const hasStepContent = description != null || splitPanel != null;

  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();

      if (hasStepContent && !isDefaultFinishedCardStep(cardId, stepId)) {
        onStepClicked({ stepId, cardId, sectionId, isExpanded: !isExpandedStep });
      }

      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.landing,
        path: `#${stepId}`,
      });
    },
    [hasStepContent, cardId, stepId, navigateToApp, onStepClicked, sectionId, isExpandedStep]
  );

  const isDone = finishedSteps.has(stepId);

  const handleStepButtonClicked = useCallback(
    (e) => {
      e.preventDefault();
      onStepButtonClicked({ stepId, cardId, sectionId, undo: isDone ? true : false });
    },
    [cardId, isDone, onStepButtonClicked, sectionId, stepId]
  );

  const panelClassNames = classnames({
    'step-panel-collapsed': !isExpandedStep,
    'step-panel-expanded': isExpandedStep,
    'step-panel': true,
  });

  return (
    <EuiPanel
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      className={panelClassNames}
      id={stepId}
    >
      <EuiFlexGroup
        gutterSize="s"
        css={css`
          cursor: ${hasStepContent ? 'pointer' : 'default'};
        `}
      >
        <EuiFlexItem
          grow={false}
          onClick={toggleStep}
          css={css`
            align-self: center;
          `}
        >
          <span
            className="step-icon"
            css={css`
              border-radius: 50%;
              width: ${euiTheme.size.xxxl};
              height: ${euiTheme.size.xxxl};
              padding: ${euiTheme.size.m};
              background-color: rgb(247, 248, 252);

              .step-panel:hover & {
                background-color: rgb(0, 191, 179, 0.1);
              }
            `}
          >
            {icon && <EuiIcon {...icon} size="l" className="eui-alignMiddle" />}
          </span>
        </EuiFlexItem>
        <EuiFlexItem
          grow={1}
          onClick={toggleStep}
          css={css`
            align-self: center;
          `}
        >
          <span
            css={css`
              padding-right: ${euiTheme.size.m};
              line-height: ${euiTheme.size.xxxl};
              font-size: ${euiTheme.base * 0.875}px;
              font-weight: ${euiTheme.font.weight.semiBold};
              vertical-align: middle;
            `}
          >
            {title}
          </span>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-self: center;
          `}
        >
          <div>
            {isExpandedStep && isExpandedCard && (
              <EuiButtonEmpty
                color="primary"
                iconType={isDone ? icon_cross : 'checkInCircleFilled'}
                size="xs"
                css={css`
                  margin-right: ${euiTheme.base * 0.375}px;
                  border-radius: ${euiTheme.border.radius.medium};
                  border: 1px solid ${euiTheme.colors.lightShade};
                  .euiIcon {
                    inline-size: ${euiTheme.size.m};
                  }
                `}
                onClick={handleStepButtonClicked}
              >
                {isDone ? UNDO_MARK_AS_DONE_TITLE : MARK_AS_DONE_TITLE}
              </EuiButtonEmpty>
            )}
            {isDone && (
              <EuiBadge
                css={css`
                  background-color: rgba(0, 191, 179, 0.1);
                  color: ${euiTheme.colors.successText};
                `}
                color="success"
              >
                {ALL_DONE_TEXT}
              </EuiBadge>
            )}
            {/* Use button here to avoid styles added by EUI*/}
            <EuiButtonIcon
              className="eui-displayInlineBlock"
              color="primary"
              onClick={toggleStep}
              iconType={isExpandedStep ? 'arrowUp' : 'arrowDown'}
              aria-label={isExpandedStep ? COLLAPSE_STEP_BUTTON_LABEL : EXPAND_STEP_BUTTON_LABEL}
              size="xs"
              css={css`
                margin-left: ${euiTheme.base * 0.375}px;
              `}
              isDisabled={!hasStepContent}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <StepContent
        description={description}
        hasStepContent={hasStepContent}
        isExpandedStep={isExpandedStep}
        splitPanel={splitPanel}
        stepId={stepId}
      />
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
