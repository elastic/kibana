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

import { useModalContext } from './hooks/use_modal_context';
import { AllDoneText } from './all_done_text';
import { hasCardDone, isDefaultFinishedCard } from './helpers';

const CardItemComponent: React.FC<{
  card: Card;
  euiTheme: EuiThemeComputed;
  finishedCards: Set<CardId>;
  shadow?: string;
}> = ({ card, euiTheme, finishedCards, shadow }) => {
  const { toggleFinishedCard } = useModalContext();
  const isCardDone = hasCardDone(card.id, finishedCards);
  const undoFinishedCard = useCallback(() => {
    toggleFinishedCard({ cardId: card.id, undo: true });
  }, [card.id, toggleFinishedCard]);

  return (
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
                {isDefaultFinishedCard(card.id) ? (
                  <AllDoneText />
                ) : (
                  <EuiButtonEmpty
                    flush="both"
                    onClick={undoFinishedCard}
                    css={css`
                      font-weight: ${euiTheme.font.weight.regular};
                    `}
                  >
                    <AllDoneText />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

CardItemComponent.displayName = 'CardItemComponent';

export const CardItem = React.memo(CardItemComponent);
