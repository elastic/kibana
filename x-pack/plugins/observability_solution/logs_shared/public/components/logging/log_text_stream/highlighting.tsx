/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import styled from '@emotion/styled';

export const ActiveHighlightMarker = styled.mark`
  color: ${({ theme }) => theme.euiTheme.colors.textParagraph};
  background-color: ${({ theme }) => theme.euiTheme.colors.backgroundFilledAccent};
  outline: 1px solid ${({ theme }) => theme.euiTheme.colors.backgroundFilledAccent};
`;

export const HighlightMarker = styled.mark`
  color: ${({ theme }) => theme.euiTheme.colors.textParagraph};
  background-color: ${({ theme }) => theme.euiTheme.colors.backgroundLightAccent};
  outline: 1px solid ${({ theme }) => theme.euiTheme.colors.backgroundLightAccent};
`;

export const highlightFieldValue = (
  value: string,
  highlightTerms: string[],
  HighlightComponent: React.ComponentType<React.PropsWithChildren<{}>>
) =>
  highlightTerms.reduce<React.ReactNode[]>(
    (fragments, highlightTerm, index) => {
      const lastFragment = fragments[fragments.length - 1];

      if (typeof lastFragment !== 'string') {
        return fragments;
      }

      const highlightTermPosition = lastFragment.indexOf(highlightTerm);

      if (highlightTermPosition > -1) {
        return [
          ...fragments.slice(0, fragments.length - 1),
          lastFragment.slice(0, highlightTermPosition),
          <HighlightComponent key={`highlight-${highlightTerm}-${index}`}>
            {highlightTerm}
          </HighlightComponent>,
          lastFragment.slice(highlightTermPosition + highlightTerm.length),
        ];
      } else {
        return fragments;
      }
    },
    [value]
  );
