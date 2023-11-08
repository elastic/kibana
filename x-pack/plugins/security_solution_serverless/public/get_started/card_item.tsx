/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { Card, CardId } from './types';

import { ALL_DONE_TEXT } from './translations';
import { useModalContext } from '../common/hooks/modal_context';

const hasCardDone = (cardId: CardId, finishedCards: Set<CardId>) => finishedCards.has(cardId);

const CardItemComponent: React.FC<{
  card: Card;
  euiTheme: EuiThemeComputed;
  finishedCards: Set<CardId>;
  shadow?: string;
}> = ({ card, euiTheme, finishedCards, shadow }) => {
  const { toggleFinishedCard } = useModalContext();
  const isCardDone = hasCardDone(card.id, finishedCards);
  const undoFinishedCard = useCallback(() => {
    if (card.allowUndo !== false) {
      toggleFinishedCard({ cardId: card.id, undo: true });
    }
  }, [card.allowUndo, card.id, toggleFinishedCard]);

  return card ? (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={css`
        ${shadow ?? ''};
        padding: ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l};
        margin-bottom: ${euiTheme.size.xs};
        border-radius: ${euiTheme.size.xs};
      `}
      data-test-subj={`card-${card.id}`}
      borderRadius="none"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem
              grow={false}
              css={css`
                align-self: center;
              `}
            >
              {card.icon && <EuiIcon {...card.icon} size="xl" className="eui-alignMiddle" />}
            </EuiFlexItem>
            <EuiFlexItem
              grow={true}
              css={css`
                align-self: center;
              `}
            >
              <EuiTitle
                size="xxs"
                css={css`
                  line-height: ${euiTheme.base * 2}px;
                `}
              >
                <>
                  <h4
                    css={css`
                      font-size: ${euiTheme.base * 0.875}px;
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                  >
                    {card.title}
                  </h4>
                  {card.description && (
                    <>
                      <EuiSpacer size="s" />
                      <h4
                        css={css`
                          font-size: ${euiTheme.size.m};
                        `}
                      >
                        {card.description}
                      </h4>
                    </>
                  )}
                </>
              </EuiTitle>
            </EuiFlexItem>
            {!isCardDone && card.startButton && (
              <EuiFlexItem
                grow={false}
                css={css`
                  align-self: center;
                `}
              >
                {card.startButton}
              </EuiFlexItem>
            )}
            {isCardDone && (
              <EuiFlexItem
                grow={false}
                css={css`
                  align-self: center;
                `}
              >
                <EuiButtonEmpty onClick={undoFinishedCard}>
                  <span
                    className="eui-alignMiddle"
                    css={css`
                      font-size: ${euiTheme.base * 0.875}px;
                      color: #69707d;
                    `}
                  >
                    {ALL_DONE_TEXT}
                  </span>
                  <EuiIcon
                    className="eui-alignMiddle"
                    css={css`
                      padding-left: ${euiTheme.size.xs};
                    `}
                    type="checkInCircleFilled"
                    color="#00BFB3"
                    size="l"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
