/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { CardId, Section } from '../types';

import { CardItem } from '../card_item';
import { getSections } from '../sections';

const setUpCards = ({
  euiTheme,
  finishedCards,
  section,
  shadow,
}: {
  euiTheme: EuiThemeComputed;
  finishedCards: Set<CardId>;
  section: Section;
  shadow?: string;
}) => {
  return section
    ? section.cards?.map<React.ReactNode>((cardItem) => (
        <EuiFlexItem key={cardItem.id}>
          <CardItem
            card={cardItem}
            data-test-subj={`${section.id}-${cardItem.id}`}
            euiTheme={euiTheme}
            finishedCards={finishedCards}
            shadow={shadow}
          />
        </EuiFlexItem>
      ))
    : null;
};

export const useSetUpSections = () => {
  const setUpSections = useCallback(
    ({
      euiTheme,
      finishedCards,
      shadow = '',
    }: {
      euiTheme: EuiThemeComputed;
      finishedCards: Set<CardId>;
      shadow?: string;
    }) =>
      getSections().reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({ finishedCards, euiTheme, section: currentSection, shadow });
        if (cardNodes && cardNodes.length > 0) {
          acc.push(
            <EuiPanel
              color="plain"
              element="div"
              grow={false}
              paddingSize="none"
              hasShadow={false}
              borderRadius="none"
              css={css`
                margin: ${euiTheme.size.l} 0;
                padding-top: 4px;
                background-color: ${euiTheme.colors.lightestShade};
              `}
              key={currentSection.id}
              data-test-subj={`section-${currentSection.id}`}
            >
              <EuiTitle size="m">
                <span>{currentSection.title}</span>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup
                gutterSize="m"
                direction="column"
                css={css`
                  ${euiTheme.size.base}
                `}
              >
                {cardNodes}
              </EuiFlexGroup>
            </EuiPanel>
          );
        }
        return acc;
      }, []),
    []
  );

  return { setUpSections };
};
