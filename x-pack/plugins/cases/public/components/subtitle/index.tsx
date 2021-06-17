/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeS};

    .casesSubtitle__item {
      color: ${theme.eui.euiTextSubduedColor};
      font-size: ${theme.eui.euiFontSizeXS};
      line-height: ${theme.eui.euiLineHeight};

      @media only screen and (min-width: ${theme.eui.euiBreakpoints.s}) {
        display: inline-block;
        margin-right: ${theme.eui.euiSize};

        &:last-child {
          margin-right: 0;
        }
      }
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

interface SubtitleItemProps {
  children: string | React.ReactNode;
  dataTestSubj?: string;
}

const SubtitleItem = React.memo<SubtitleItemProps>(
  ({ children, dataTestSubj = 'header-panel-subtitle' }) => {
    if (typeof children === 'string') {
      return (
        <p className="casesSubtitle__item casesSubtitle__item--text" data-test-subj={dataTestSubj}>
          {children}
        </p>
      );
    } else {
      return (
        <div
          className="casesSubtitle__item casesSubtitle__item--node"
          data-test-subj={dataTestSubj}
        >
          {children}
        </div>
      );
    }
  }
);
SubtitleItem.displayName = 'SubtitleItem';

export interface SubtitleProps {
  items: string | React.ReactNode | Array<string | React.ReactNode>;
}

export const Subtitle = React.memo<SubtitleProps>(({ items }) => (
  <Wrapper className="casesSubtitle">
    {Array.isArray(items) ? (
      items.map((item, i) => <SubtitleItem key={i}>{item}</SubtitleItem>)
    ) : (
      <SubtitleItem>{items}</SubtitleItem>
    )}
  </Wrapper>
));
Subtitle.displayName = 'Subtitle';
