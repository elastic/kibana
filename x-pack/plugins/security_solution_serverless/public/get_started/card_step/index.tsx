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
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo } from 'react';

import classnames from 'classnames';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { CardId, OnStepClicked, ToggleTaskCompleteStatus, SectionId, StepId } from '../types';
import {
  ALL_DONE_TEXT,
  COLLAPSE_STEP_BUTTON_LABEL,
  EXPAND_STEP_BUTTON_LABEL,
} from '../translations';
import { getStepsByActiveProduct } from '../helpers';
import type { ProductLine } from '../../../common/product';

import { StepContent } from './step_content';
import { useKibana } from '../../common/services';

const HEIGHT_ANIMATION_DURATION = 250;

const CardStepComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  cardId: CardId;
  expandedSteps: Set<StepId>;
  finishedSteps: Set<StepId>;
  isExpandedCard: boolean;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  stepId: StepId;
}> = ({
  activeProducts,
  cardId,
  expandedSteps,
  finishedSteps = new Set(),
  isExpandedCard,
  toggleTaskCompleteStatus,
  onStepClicked,
  sectionId,
  stepId,
}) => {
  const { euiTheme } = useEuiTheme();

  const { navigateToApp } = useKibana().services.application;

  const stepContentRef = React.useRef<HTMLDivElement>(null);

  const isExpandedStep = expandedSteps.has(stepId);
  const [panelClassNames, setPanelClassNames] = React.useState('');
  const steps = useMemo(
    () => getStepsByActiveProduct({ activeProducts, cardId, sectionId }),
    [activeProducts, cardId, sectionId]
  );
  const { title, description, splitPanel, icon, checkIfStepCompleted } =
    steps?.find((step) => step.id === stepId) ?? {};
  const hasStepContent = description != null || splitPanel != null;
  const expandedStepPanelHeight = `calc(${stepContentRef.current?.offsetHeight}px + ${euiTheme.size.l} + ${euiTheme.size.xxxl})`;

  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();

      if (hasStepContent) {
        // Toggle step and sync the expanded card step to storage & reducer
        onStepClicked({ stepId, cardId, sectionId, isExpanded: !isExpandedStep });

        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.landing,
          path: `#${stepId}`,
        });
      }
    },
    [hasStepContent, cardId, stepId, navigateToApp, onStepClicked, sectionId, isExpandedStep]
  );

  const updateStepStatus = useCallback(
    (undo: boolean | undefined) => {
      toggleTaskCompleteStatus({ stepId, cardId, sectionId, undo });
    },
    [cardId, toggleTaskCompleteStatus, sectionId, stepId]
  );

  const isDone = finishedSteps.has(stepId);

  useEffect(() => {
    if (isExpandedCard) {
      setPanelClassNames(
        classnames({
          'step-panel-expanded': isExpandedCard,
        })
      );
    } else {
      setPanelClassNames(
        classnames({
          'step-panel-expanded': true,
          'step-panel-collapsed': true,
        })
      );

      setTimeout(() => {
        setPanelClassNames(
          classnames({
            'step-panel-expanded': false,
            'step-panel-collapsed': true,
          })
        );
      }, HEIGHT_ANIMATION_DURATION);
    }
  }, [isExpandedCard, expandedSteps]);

  return (
    <EuiPanel
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      className={panelClassNames}
      id={stepId}
      css={css`
        overflow: hidden;
        height: ${isExpandedStep ? expandedStepPanelHeight : euiTheme.size.xxxl};
        transition: height ${HEIGHT_ANIMATION_DURATION}ms ease-out;

        &.step-panel-expanded {
          height: ${stepContentRef.current?.offsetHeight ? expandedStepPanelHeight : 'auto'};
          transition: height ${HEIGHT_ANIMATION_DURATION}ms ease-in;
        }

        &.step-panel-collapsed,
        &.step-panel-expanded.step-panel-collapsed {
          height: ${euiTheme.size.xxxl};
        }
      `}
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
      <div ref={stepContentRef}>
        <StepContent
          description={description}
          hasStepContent={hasStepContent}
          isExpandedStep={isExpandedStep}
          updateStepStatus={updateStepStatus}
          splitPanel={splitPanel}
          stepId={stepId}
          checkIfStepCompleted={checkIfStepCompleted}
        />
      </div>
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
