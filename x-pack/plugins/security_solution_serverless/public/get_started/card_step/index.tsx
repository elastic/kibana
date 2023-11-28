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
  useEuiBackgroundColor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo } from 'react';

import classnames from 'classnames';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';

import type { GetRuleManagementFiltersResponse } from '@kbn/security-solution-plugin/public';

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
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import { useStepContext } from '../context/step_context';

const HEIGHT_ANIMATION_DURATION = 250;

export const isRulesTableEmpty = (
  ruleManagementFilters: GetRuleManagementFiltersResponse | undefined
) =>
  ruleManagementFilters?.rules_summary.custom_count === 0 &&
  ruleManagementFilters?.rules_summary.prebuilt_installed_count === 0;

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
  const completeBadgeBackgroundColor = useEuiBackgroundColor('success');

  const { navigateToApp } = useKibana().services.application;

  const stepContentRef = React.useRef<HTMLDivElement>(null);

  const isExpandedStep = expandedSteps.has(stepId);
  const [panelClassNames, setPanelClassNames] = React.useState('');
  const steps = useMemo(
    () => getStepsByActiveProduct({ activeProducts, cardId, sectionId }),
    [activeProducts, cardId, sectionId]
  );
  const { title, description, splitPanel, icon, autoCheckIfStepCompleted } =
    steps?.find((step) => step.id === stepId) ?? {};
  const hasStepContent = description != null || splitPanel != null;
  const expandedStepPanelHeight = `calc(${stepContentRef.current?.offsetHeight}px + ${euiTheme.size.l} + ${euiTheme.size.xxxl})`;
  const { indicesExist } = useStepContext();

  useCheckStepCompleted({
    autoCheckIfStepCompleted,
    cardId,
    indicesExist,
    sectionId,
    stepId,
    toggleTaskCompleteStatus,
  });

  const isDone = finishedSteps.has(stepId);

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

  useEffect(() => {
    // Handle card expansion transition
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
        gutterSize="none"
        css={css`
          cursor: ${hasStepContent ? 'pointer' : 'default'};
          gap: ${euiTheme.size.base};
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
              background-color: ${euiTheme.colors.body};
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
                  background-color: ${completeBadgeBackgroundColor};
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
      {hasStepContent && isExpandedStep && (
        <div ref={stepContentRef}>
          <StepContent
            autoCheckIfStepCompleted={autoCheckIfStepCompleted}
            cardId={cardId}
            description={description}
            hasStepContent={hasStepContent}
            indicesExist={indicesExist}
            isExpandedStep={isExpandedStep}
            sectionId={sectionId}
            splitPanel={splitPanel}
            stepId={stepId}
            toggleTaskCompleteStatus={toggleTaskCompleteStatus}
          />
        </div>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
