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
  EuiText,
  useEuiTheme,
  EuiButtonEmpty,
  useEuiShadow,
  useEuiBackgroundColorCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import classnames from 'classnames';
import type { CardId, OnStepButtonClicked, OnStepClicked, SectionId, StepId } from './types';
import icon_step from './images/icon_step.svg';
import icon_cross from './images/icon_cross.svg';
import { UNDO_MARK_AS_DONE_TITLE, MARK_AS_DONE_TITLE } from './translations';
import { getStepsByActiveProduct } from './helpers';
import type { ProductLine } from '../../common/product';
import { getProductBadges } from './badge';
import {
  LEFT_CONTENT_PANEL_WIDTH,
  RIGHT_CONTENT_HEIGHT,
  RIGHT_CONTENT_PANEL_WIDTH,
  RIGHT_CONTENT_WIDTH,
} from './sections';

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
  const shadow = useEuiShadow('s');
  const colorStyles = useEuiBackgroundColorCSS();
  const cssStyles = [colorStyles.primary];

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

  const panelClassNames = classnames({
    'step-panel-collapsed': !expandStep,
    'step-panel-expanded': expandStep,
  });

  return (
    <EuiPanel
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      className={panelClassNames}
      css={css`
        padding: ${euiTheme.size.base};
        margin: 0 ${euiTheme.size.s} 0;

        &.step-panel-collapsed:hover {
          ${cssStyles};
          border-radius: ${euiTheme.border.radius.medium};
        }
      `}
    >
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
            size="l"
            color={euiTheme.colors.success}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1} onClick={toggleStep}>
          <strong>
            <span
              css={css`
                padding-right: ${euiTheme.size.m};
                line-height: ${euiTheme.size.l};
                vertical-align: middle;
              `}
            >
              {title}
            </span>
            {badges.map((badge) => (
              <EuiBadge
                key={`${stepId}-badge-${badge.id}`}
                color="hollow"
                css={css`
                  margin: 0 ${euiTheme.size.s} 0 0;
                `}
              >
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
            {expandStep && (
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
            )}
            <button
              className="eui-displayInlineBlock"
              css={css`
                padding: ${euiTheme.size.xs} ${euiTheme.base * 0.375}px;
                margin-left: ${euiTheme.base * 0.375}px;
                border-radius: ${euiTheme.border.radius.medium};
                color: ${euiTheme.colors.darkShade};
                .step-panel-expanded &:hover,
                .step-panel-expanded &:active,
                .step-panel-expanded &:focus {
                  ${cssStyles};
                }
              `}
              onClick={toggleStep}
              type="button"
            >
              <EuiIcon size="s" type={expandStep ? 'arrowDown' : 'arrowRight'} />
            </button>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {expandStep && hasStepContent && (
        <>
          <EuiFlexGroup
            direction="row"
            color="plain"
            gutterSize="none"
            css={css`
              margin-top: 20px;
              margin-left: ${euiTheme.size.l};
            `}
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
        </>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
