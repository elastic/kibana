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
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import type { CardId, OnStepButtonClicked, OnStepClicked, SectionId, StepId } from './types';
import icon_step from './images/icon_step.svg';
import icon_cross from './images/icon_cross.svg';
import { UNDO_MARK_AS_DONE_TITLE, MARK_AS_DONE_TITLE } from './translations';
import { getStepsByActiveProduct } from './helpers';
import type { ProductLine } from '../../common/product';
import { getProductBadges } from './badge';

const CardStepComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  cardId: CardId;
  expandedSteps: Set<StepId>;
  finishedStepsByCard: Set<StepId>;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  stepId: StepId;
}> = ({
  activeProducts,
  cardId,
  expandedSteps,
  finishedStepsByCard = new Set(),
  onStepButtonClicked,
  onStepClicked,
  sectionId,
  stepId,
}) => {
  const { euiTheme } = useEuiTheme();

  const expandStep = expandedSteps.has(stepId);
  const steps = useMemo(
    () => getStepsByActiveProduct({ activeProducts, cardId, sectionId }),
    [activeProducts, cardId, sectionId]
  );
  const { title, productLineRequired, description, splitPanel } =
    steps?.find((step) => step.id === stepId) ?? {};

  const badges = useMemo(() => getProductBadges(productLineRequired), [productLineRequired]);

  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();
      const newState = !expandStep;
      onStepClicked({ stepId, cardId, sectionId, isExpanded: newState });
    },
    [cardId, expandStep, onStepClicked, sectionId, stepId]
  );

  const isDone = finishedStepsByCard.has(stepId);

  const hasStepContent = description || splitPanel;

  const handleStepButtonClicked = useCallback(
    (e) => {
      e.preventDefault();
      onStepButtonClicked({ stepId, cardId, sectionId, undo: isDone ? true : false });
    },
    [cardId, isDone, onStepButtonClicked, sectionId, stepId]
  );

  return (
    <EuiPanel color="plain" grow={false} hasShadow={false} borderRadius="none" paddingSize="l">
      <EuiFlexGroup
        gutterSize="s"
        css={css`
          cursor: pointer;
        `}
      >
        <EuiFlexItem grow={false} onClick={toggleStep}>
          <EuiIcon
            data-test-subj={`${stepId}-icon`}
            type={isDone ? 'checkInCircleFilled' : icon_step}
            size="m"
            color={euiTheme.colors.success}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1} onClick={toggleStep}>
          <strong>
            <span
              css={css`
                padding-right: ${euiTheme.size.m};
              `}
            >
              {title}
            </span>
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
          <div>
            <EuiButtonEmpty
              color="primary"
              iconType={isDone ? icon_cross : 'checkInCircleFilled'}
              size="xs"
              css={css`
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
            <EuiIcon
              size="s"
              type={expandStep ? 'arrowDown' : 'arrowRight'}
              css={css`
                margin-left: ${euiTheme.base * 0.375}px;
              `}
              onClick={toggleStep}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {expandStep && hasStepContent && (
        <>
          <EuiSpacer size="l" />
          <EuiSplitPanel.Outer
            direction="row"
            color="plain"
            grow={false}
            hasShadow={false}
            borderRadius="none"
          >
            {description && (
              <EuiSplitPanel.Inner
                paddingSize="none"
                css={css`
                  padding-left: ${euiTheme.size.l};
                `}
              >
                <EuiText size="s">
                  {description?.map((desc, index) => (
                    <p
                      data-test-subj={`${stepId}-description-${index}`}
                      key={`${stepId}-description-${index}`}
                      className="eui-displayBlock"
                    >
                      {desc}
                    </p>
                  ))}
                </EuiText>
              </EuiSplitPanel.Inner>
            )}
            {splitPanel && (
              <EuiSplitPanel.Inner
                data-test-subj="split-panel"
                paddingSize="none"
                css={css`
                  padding-left: ${euiTheme.size.m};
                `}
              >
                {splitPanel}
              </EuiSplitPanel.Inner>
            )}
          </EuiSplitPanel.Outer>
        </>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
