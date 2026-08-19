/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useServiceMapSearchHighlight } from './service_map_search_context';

interface HighlightWrapperProps {
  nodeId: string;
  contextHighlight?: boolean;
  children: React.ReactNode;
}

export function HighlightWrapper({
  nodeId,
  contextHighlight = false,
  children,
}: HighlightWrapperProps) {
  const { euiTheme } = useEuiTheme();
  const { isSearchMatch, isActiveSearchMatch } = useServiceMapSearchHighlight(nodeId);

  const frameStyles = useMemo(
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
        : contextHighlight
        ? `
        border: ${euiTheme.border.width.thick} dashed ${euiTheme.colors.primary};
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      `
        : ''}
    `,
    [euiTheme, isActiveSearchMatch, contextHighlight]
  );

  const testSubj = isActiveSearchMatch
    ? 'serviceMapNodeSearchHighlightFrame'
    : contextHighlight
    ? 'serviceMapNodeContextHighlightFrame'
    : undefined;

  return (
    <div
      data-test-subj={testSubj}
      css={frameStyles}
      data-search-match={isSearchMatch || undefined}
      data-search-active-match={isActiveSearchMatch || undefined}
    >
      {children}
    </div>
  );
}
