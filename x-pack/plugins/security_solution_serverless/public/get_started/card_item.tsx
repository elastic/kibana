/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import type { CardId, OnStepButtonClicked, OnStepClicked, SectionId, Step, StepId } from './types';
import * as i18n from './translations';
import { CardStep } from './card_step';
import { getSections } from './sections';

const CardItemComponent: React.FC<{
  activeSteps: Step[] | undefined;
  cardId: CardId;
  euiTheme: EuiThemeComputed;
  finishedSteps: Record<CardId, Set<StepId>>;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  shadow?: string;
  stepsLeft?: number;
  timeInMins?: number;
}> = ({
  activeSteps,
  stepsLeft,
  timeInMins,
  shadow,
  euiTheme,
  onStepClicked,
  onStepButtonClicked,
  finishedSteps,
  sectionId,
  cardId,
}) => {
  const section = getSections().find((s) => s.id === sectionId);
  const cardItem = section?.cards?.find((c) => c.id === cardId);
  const [expandCard, setExpandCard] = useState(false);
  const toggleCard = useCallback(
    (e) => {
      e.preventDefault();
      setExpandCard(!expandCard);
    },
    [expandCard]
  );
  const hasActiveSteps = activeSteps != null && activeSteps.length > 0;
  return cardItem && hasActiveSteps ? (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        ${shadow ?? ''};
      `}
    >
      <EuiFlexGroup
        gutterSize="m"
        css={css`
          gap: 14px;
          padding: ${euiTheme.size.xxs} 10px;
        `}
        direction="column"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            onClick={toggleCard}
            css={css`
              cursor: pointer;
            `}
          >
            <EuiFlexItem grow={false}>
              {cardItem.icon && <EuiIcon {...cardItem.icon} className="eui-alignMiddle" />}
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiTitle
                size="xxs"
                css={css`
                  line-height: ${euiTheme.base * 2}px;
                `}
              >
                <h4>{cardItem.title}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {(timeInMins != null || stepsLeft != null) && (
              <EuiFlexItem
                css={css`
                  align-items: end;
                `}
              >
                <EuiText
                  size="s"
                  css={css`
                    line-height: ${euiTheme.base * 2}px;
                  `}
                >
                  {stepsLeft != null && stepsLeft > 0 && (
                    <strong>{i18n.STEPS_LEFT(stepsLeft)}</strong>
                  )}
                  {timeInMins != null && timeInMins > 0 && (
                    <span>
                      {' • '}
                      {i18n.STEP_TIME_MIN(timeInMins)}
                    </span>
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {expandCard && hasActiveSteps && (
          <EuiFlexItem>
            {activeSteps.map((step) => {
              return (
                <CardStep
                  key={step.id}
                  sectionId={sectionId}
                  cardId={cardItem.id}
                  step={step}
                  onStepClicked={onStepClicked}
                  onStepButtonClicked={onStepButtonClicked}
                  finishedStepsByCard={finishedSteps[cardItem.id]}
                />
              );
            })}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
