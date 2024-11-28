/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { QuerySuggestion, QuerySuggestionTypes } from '@kbn/unified-search-plugin/public';
import { transparentize } from 'polished';

interface Props {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export const SuggestionItem: React.FC<Props> = (props) => {
  const { isSelected, onClick, onMouseEnter, suggestion } = props;
  const { euiTheme } = useEuiTheme();

  return (
    <SuggestionItemContainer
      isSelected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      euiTheme={euiTheme}
    >
      <SuggestionItemIconField suggestionType={suggestion.type} euiTheme={euiTheme}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </SuggestionItemIconField>
      <SuggestionItemTextField euiTheme={euiTheme}>{suggestion.text}</SuggestionItemTextField>
      <SuggestionItemDescriptionField euiTheme={euiTheme}>
        {suggestion.description}
      </SuggestionItemDescriptionField>
    </SuggestionItemContainer>
  );
};

SuggestionItem.defaultProps = {
  isSelected: false,
};

const SuggestionItemContainer = euiStyled.div<{
  isSelected?: boolean;
  euiTheme: EuiThemeComputed;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${(props) => props.euiTheme.size.s};
  height: ${(props) => props.euiTheme.size.xl};
  white-space: nowrap;
  background-color: ${(props) =>
    props.isSelected ? props.euiTheme.colors.lightestShade : 'transparent'};
`;

const SuggestionItemField = euiStyled.div<{
  euiTheme: EuiThemeComputed;
}>`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${(props) => props.euiTheme.size.xl};
  padding: ${(props) => props.euiTheme.size.xs};
`;

const SuggestionItemIconField = euiStyled(SuggestionItemField)<{
  suggestionType: QuerySuggestionTypes;
}>`
  background-color: ${(props) =>
    transparentize(0.9, getEuiIconColor(props.euiTheme, props.suggestionType))};
  color: ${(props) => getEuiIconColor(props.euiTheme, props.suggestionType)};
  flex: 0 0 auto;
  justify-content: center;
  width: ${(props) => props.euiTheme.size.xl};
`;

const SuggestionItemTextField = euiStyled(SuggestionItemField)`
  flex: 2 0 0;
  font-family: ${(props) => props.euiTheme.font.familyCode};
`;

const SuggestionItemDescriptionField = euiStyled(SuggestionItemField)`
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${(props) => props.euiTheme.font.familyCode};
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

const getEuiIconColor = (
  theme: EuiThemeComputed<{}>,
  suggestionType: QuerySuggestionTypes
): string => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return theme?.colors.vis.euiColorVis7;
    case QuerySuggestionTypes.Value:
      return theme?.colors.vis.euiColorVis0;
    case QuerySuggestionTypes.Operator:
      return theme?.colors.vis.euiColorVis1;
    case QuerySuggestionTypes.Conjunction:
      return theme?.colors.vis.euiColorVis2;
    case QuerySuggestionTypes.RecentSearch:
    default:
      return theme?.colors.mediumShade;
  }
};
