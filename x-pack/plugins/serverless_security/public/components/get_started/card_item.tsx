/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiThemeComputed,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { Card } from './types';
import * as i18n from './translations';
import { CardStep } from './card_step';

const CardItemComponent: React.FC<{
  stepsLeft: number;
  timeInMins: number;
  cardItem: Card;
  shadow?: string;
  euiTheme: EuiThemeComputed;
}> = ({ stepsLeft, timeInMins, shadow, cardItem, euiTheme }) => {
  const [expandCard, setExpandCard] = useState(false);
  const toggleCard = useCallback(
    (e) => {
      e.preventDefault();
      setExpandCard(!expandCard);
    },
    [expandCard]
  );
  return (
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
            {(timeInMins > 0 || stepsLeft > 0) && (
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
                  {stepsLeft && <strong>{i18n.STEPS_LEFT(stepsLeft)}</strong>}
                  {timeInMins && <span> • {i18n.STEP_TIME_MIN(timeInMins)}</span>}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {expandCard && cardItem?.steps && (
          <EuiFlexItem>
            {cardItem?.steps?.map((step) => {
              return <CardStep key={step.id} step={step} />;
            })}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
