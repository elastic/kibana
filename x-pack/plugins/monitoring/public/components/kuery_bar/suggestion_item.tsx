/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { transparentize } from 'polished';

import { QuerySuggestion, QuerySuggestionTypes } from '@kbn/unified-search-plugin/public';

interface Props {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export const SuggestionItem: React.FC<Props> = ({
  isSelected = false,
  onClick,
  onMouseEnter,
  suggestion,
}) => {
  return (
    <div
      css={suggestionItemContainerStyle(isSelected)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div css={suggestionItemIconFieldStyle(suggestion.type)}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </div>
      <div css={suggestionItemTextFieldStyle}>{suggestion.text}</div>
      <div css={suggestionItemDescriptionFieldStyle}>{suggestion.description}</div>
    </div>
  );
};

const suggestionItemContainerStyle = (isSelected?: boolean) => (theme: UseEuiTheme) =>
  css`
    display: flex;
    flex-direction: row;
    font-size: ${theme.eui.euiFontSizeS};
    height: ${theme.eui.euiSizeXL};
    white-space: nowrap;
    background-color: ${isSelected ? theme.eui.euiColorLightestShade : 'transparent'};
  `;

const suggestionItemFieldStyle = (theme: UseEuiTheme) => css`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${theme.eui.euiSizeXL};
  padding: ${theme.eui.euiSizeXS};
`;

const suggestionItemIconFieldStyle =
  (suggestionType: QuerySuggestionTypes) => (theme: UseEuiTheme) =>
    css`
      ${suggestionItemFieldStyle(theme)};
      background-color: ${transparentize(0.9, getEuiIconColor(theme, suggestionType))};
      color: ${getEuiIconColor(theme, suggestionType)};
      flex: 0 0 auto;
      justify-content: center;
      width: ${theme.eui.euiSizeXL};
    `;

const suggestionItemTextFieldStyle = (theme: UseEuiTheme) => css`
  ${suggestionItemFieldStyle(theme)};
  flex: 2 0 0;
  font-family: ${theme.eui.euiCodeFontFamily};
`;

const suggestionItemDescriptionFieldStyle = (theme: UseEuiTheme) => css`
  ${suggestionItemFieldStyle(theme)};
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${theme.eui.euiCodeFontFamily};
    }
  }
`;

const getEuiIconType = (suggestionType: QuerySuggestionTypes) => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return 'kqlField';
    case QuerySuggestionTypes.Value:
      return 'kqlValue';
    case QuerySuggestionTypes.RecentSearch:
      return 'search';
    case QuerySuggestionTypes.Conjunction:
      return 'kqlSelector';
    case QuerySuggestionTypes.Operator:
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (theme: UseEuiTheme, suggestionType: QuerySuggestionTypes): string => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return theme?.eui.euiColorVis7;
    case QuerySuggestionTypes.Value:
      return theme?.eui.euiColorVis0;
    case QuerySuggestionTypes.Operator:
      return theme?.eui.euiColorVis1;
    case QuerySuggestionTypes.Conjunction:
      return theme?.eui.euiColorVis2;
    case QuerySuggestionTypes.RecentSearch:
    default:
      return theme?.eui.euiColorMediumShade;
  }
};
