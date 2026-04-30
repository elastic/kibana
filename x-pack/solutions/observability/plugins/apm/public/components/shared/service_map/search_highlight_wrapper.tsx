/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface SearchHighlightWrapperProps {
  isSearchMatch: boolean;
  isActiveSearchMatch: boolean;
  children: React.ReactNode;
}

export function SearchHighlightWrapper({
  isSearchMatch,
  isActiveSearchMatch,
  children,
}: SearchHighlightWrapperProps) {
  const { euiTheme } = useEuiTheme();

  const searchFrameStyles = useMemo(
    () => css`
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      max-width: 100%;
      padding: ${euiTheme.size.s};
      border: ${euiTheme.border.width.thick} solid transparent;
      border-radius: ${euiTheme.border.radius.medium};
      ${isActiveSearchMatch
        ? `
        outline: ${euiTheme.border.width.thick} dashed ${euiTheme.colors.textSubdued};
        outline-offset: -${euiTheme.border.width.thick};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `
        : ''}
    `,
    [euiTheme, isActiveSearchMatch]
  );

  return (
    <div
      data-test-subj={isActiveSearchMatch ? 'serviceMapNodeSearchHighlightFrame' : undefined}
      css={searchFrameStyles}
      data-search-match={isSearchMatch || undefined}
      data-search-active-match={isActiveSearchMatch || undefined}
    >
      {children}
    </div>
  );
}
