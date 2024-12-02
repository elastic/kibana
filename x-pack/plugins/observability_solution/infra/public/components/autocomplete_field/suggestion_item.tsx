/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import styled from '@emotion/styled';
import { Theme } from '@emotion/react';
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

const SuggestionItemContainer = styled.div<{
  isSelected?: boolean;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${({ theme }) => theme.euiTheme.size.m};
  height: ${({ theme }) => theme.euiTheme.size.xl};
  white-space: nowrap;
  background-color: ${(props) =>
    props.isSelected ? props.theme.euiTheme.colors.lightestShade : 'transparent'};
`;

const SuggestionItemField = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${({ theme }) => theme.euiTheme.size.xl};
  padding: ${({ theme }) => theme.euiTheme.size.xs};
`;

const SuggestionItemIconField = styled(SuggestionItemField)<{
  suggestionType: QuerySuggestionTypes;
}>`
  background-color: ${({ theme, suggestionType }) =>
    transparentize(0.9, getEuiIconColor(theme, suggestionType))};
  color: ${({ theme, suggestionType }) => getEuiIconColor(theme, suggestionType)};
  flex: 0 0 auto;
  justify-content: center;
  width: ${({ theme }) => theme.euiTheme.size.xl};
`;

const SuggestionItemTextField = styled(SuggestionItemField)`
  flex: 2 0 0;
  font-family: ${({ theme }) => theme.euiTheme.font.familyCode};
`;

const SuggestionItemDescriptionField = styled(SuggestionItemField)`
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${({ theme }) => theme.euiTheme.font.familyCode};
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

const getEuiIconColor = (theme: Theme, suggestionType: QuerySuggestionTypes): string => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return theme?.euiTheme.colors.vis.euiColorVis7;
    case QuerySuggestionTypes.Value:
      return theme?.euiTheme.colors.vis.euiColorVis0;
    case QuerySuggestionTypes.Operator:
      return theme?.euiTheme.colors.vis.euiColorVis1;
    case QuerySuggestionTypes.Conjunction:
      return theme?.euiTheme.colors.vis.euiColorVis2;
    case QuerySuggestionTypes.RecentSearch:
    default:
      return theme?.euiTheme.colors.mediumShade;
  }
};
