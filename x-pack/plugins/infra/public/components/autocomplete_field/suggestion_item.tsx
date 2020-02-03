/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { transparentize } from 'polished';
import React from 'react';

import { euiStyled } from '../../../../observability/public';
import { autocomplete } from '../../../../../../src/plugins/data/public';

interface Props {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: autocomplete.QuerySuggestion;
}

export const SuggestionItem: React.FC<Props> = props => {
  const { isSelected, onClick, onMouseEnter, suggestion } = props;

  return (
    <SuggestionItemContainer isSelected={isSelected} onClick={onClick} onMouseEnter={onMouseEnter}>
      <SuggestionItemIconField suggestionType={suggestion.type}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </SuggestionItemIconField>
      <SuggestionItemTextField>{suggestion.text}</SuggestionItemTextField>
      <SuggestionItemDescriptionField>{suggestion.description}</SuggestionItemDescriptionField>
    </SuggestionItemContainer>
  );
};

SuggestionItem.defaultProps = {
  isSelected: false,
};

const SuggestionItemContainer = euiStyled.div<{
  isSelected?: boolean;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${props => props.theme.eui.euiFontSizeS};
  height: ${props => props.theme.eui.euiSizeXL};
  white-space: nowrap;
  background-color: ${props =>
    props.isSelected ? props.theme.eui.euiColorLightestShade : 'transparent'};
`;

const SuggestionItemField = euiStyled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${props => props.theme.eui.euiSizeXL};
  padding: ${props => props.theme.eui.euiSizeXS};
`;

const SuggestionItemIconField = euiStyled(SuggestionItemField)<{
  suggestionType: autocomplete.QuerySuggestionsTypes;
}>`
  background-color: ${props =>
    transparentize(0.9, getEuiIconColor(props.theme, props.suggestionType))};
  color: ${props => getEuiIconColor(props.theme, props.suggestionType)};
  flex: 0 0 auto;
  justify-content: center;
  width: ${props => props.theme.eui.euiSizeXL};
`;

const SuggestionItemTextField = euiStyled(SuggestionItemField)`
  flex: 2 0 0;
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
`;

const SuggestionItemDescriptionField = euiStyled(SuggestionItemField)`
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${props => props.theme.eui.euiCodeFontFamily};
    }
  }
`;

const getEuiIconType = (suggestionType: autocomplete.QuerySuggestionsTypes) => {
  switch (suggestionType) {
    case autocomplete.QuerySuggestionsTypes.Field:
      return 'kqlField';
    case autocomplete.QuerySuggestionsTypes.Value:
      return 'kqlValue';
    case autocomplete.QuerySuggestionsTypes.RecentSearch:
      return 'search';
    case autocomplete.QuerySuggestionsTypes.Conjunction:
      return 'kqlSelector';
    case autocomplete.QuerySuggestionsTypes.Operator:
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (
  theme: any,
  suggestionType: autocomplete.QuerySuggestionsTypes
): string => {
  switch (suggestionType) {
    case autocomplete.QuerySuggestionsTypes.Field:
      return theme.eui.euiColorVis7;
    case autocomplete.QuerySuggestionsTypes.Value:
      return theme.eui.euiColorVis0;
    case autocomplete.QuerySuggestionsTypes.Operator:
      return theme.eui.euiColorVis1;
    case autocomplete.QuerySuggestionsTypes.Conjunction:
      return theme.eui.euiColorVis2;
    case autocomplete.QuerySuggestionsTypes.RecentSearch:
    default:
      return theme.eui.euiColorMediumShade;
  }
};
