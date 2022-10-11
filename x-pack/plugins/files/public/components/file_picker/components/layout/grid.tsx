/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

// CP = CommonProps
interface CP {
  className?: string;
}

export const Grid: FunctionComponent<CP> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: grid;
        place-items: center;
        grid-template-columns: ${euiTheme.size.m} 1fr 2fr 1fr ${euiTheme.size.m};
        grid-template-rows:
          ${euiTheme.size.xl}
          ${euiTheme.size.m}
          3fr
          1fr;
        grid-template-areas:
          '. title   title   .       .'
          '. .       .       .       .'
          '. content content content .'
          '. footer  footer  footer  .';
      `}
    >
      {children}
    </div>
  );
};

const Area =
  (area: 'title' | 'content' | 'footer' | 'content / content / footer'): FunctionComponent<CP> =>
  ({ children, className }) => {
    return (
      <div
        css={css`
          grid-area: ${area};
        `}
        className={className}
      >
        {children}
      </div>
    );
  };

export const Header = Area('title');
export const Content = Area('content');
export const ContentAndFooter = Area('content / content / footer'); // span the content and footer areas
export const Footer = Area('footer');
