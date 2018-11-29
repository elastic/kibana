/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { tint } from 'polished';
import React from 'react';
import styled from 'styled-components';

// @ts-ignore
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';

interface SuggestionItemProps {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: AutocompleteSuggestion;
}

export class SuggestionItem extends React.Component<SuggestionItemProps> {
  public static defaultProps: Partial<SuggestionItemProps> = {
    isSelected: false,
  };

  public render() {
    const { isSelected, onClick, onMouseEnter, suggestion } = this.props;

    return (
      <SuggestionItemContainer
        isSelected={isSelected}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        <SuggestionItemIconField suggestionType={suggestion.type}>
          <EuiIcon type={getEuiIconType(suggestion.type)} />
        </SuggestionItemIconField>
        <SuggestionItemTextField>{suggestion.text}</SuggestionItemTextField>
        <SuggestionItemDescriptionField
          dangerouslySetInnerHTML={{ __html: suggestion.description }}
        />
      </SuggestionItemContainer>
    );
  }
}

const SuggestionItemContainer = styled.div<{
  isSelected?: boolean;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${props => props.theme.eui.euiFontSizeS};
  height: ${props => props.theme.eui.euiSizeXl};
  white-space: nowrap;
  background-color: ${props =>
    props.isSelected ? props.theme.eui.euiColorLightestShade : 'transparent'};
`;

const SuggestionItemField = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${props => props.theme.eui.euiSizeXl};
  padding: ${props => props.theme.eui.euiSizeXs};
`;

const SuggestionItemIconField = SuggestionItemField.extend<{ suggestionType: string }>`
  background-color: ${props => tint(0.1, getEuiIconColor(props.theme, props.suggestionType))};
  color: ${props => getEuiIconColor(props.theme, props.suggestionType)};
  flex: 0 0 auto;
  justify-content: center;
  width: ${props => props.theme.eui.euiSizeXl};
`;

const SuggestionItemTextField = SuggestionItemField.extend`
  flex: 2 0 0;
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
`;

const SuggestionItemDescriptionField = SuggestionItemField.extend`
  flex: 3 0 0;
  p {
    display: inline;
    span {
      font-family: ${props => props.theme.eui.euiCodeFontFamily};
    }
  }
`;

const getEuiIconType = (suggestionType: string) => {
  switch (suggestionType) {
    case 'field':
      return 'kqlField';
    case 'value':
      return 'kqlValue';
    case 'recentSearch':
      return 'search';
    case 'conjunction':
      return 'kqlSelector';
    case 'operator':
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (theme: any, suggestionType: string): string => {
  switch (suggestionType) {
    case 'field':
      return theme.eui.euiColorVis7;
    case 'value':
      return theme.eui.euiColorVis0;
    case 'operator':
      return theme.eui.euiColorVis1;
    case 'conjunction':
      return theme.eui.euiColorVis2;
    case 'recentSearch':
    default:
      return theme.eui.euiColorMediumShade;
  }
};
