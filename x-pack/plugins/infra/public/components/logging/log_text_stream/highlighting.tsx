/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { chooseLightOrDarkColor, tintOrShade } from '../../../utils/styles';

export const ActiveHighlightMarker = euiStyled.mark`
  color: ${(props) =>
    chooseLightOrDarkColor(
      props.theme.eui.euiColorAccent,
      props.theme.eui.euiColorEmptyShade,
      props.theme.eui.euiColorDarkestShade
    )};
  background-color: ${(props) => props.theme.eui.euiColorAccent};
  outline: 1px solid ${(props) => props.theme.eui.euiColorAccent};
  };
`;

export const HighlightMarker = euiStyled.mark`
  color: ${(props) =>
    chooseLightOrDarkColor(
      tintOrShade(props.theme.eui.euiTextColor, props.theme.eui.euiColorAccent, 0.7, 0.5),
      props.theme.eui.euiColorEmptyShade,
      props.theme.eui.euiColorDarkestShade
    )};
  background-color: ${(props) =>
    tintOrShade(props.theme.eui.euiTextColor, props.theme.eui.euiColorAccent, 0.7, 0.5)};
  outline: 1px solid ${(props) =>
    tintOrShade(props.theme.eui.euiTextColor, props.theme.eui.euiColorAccent, 0.7, 0.5)};
  };
`;

export const highlightFieldValue = (
  value: string,
  highlightTerms: string[],
  HighlightComponent: React.ComponentType
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
