/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToken, IconType } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { SFC } from 'react';
import styled from 'styled-components';

import { AutocompleteSuggestion } from '../..';

interface Props {
  query: string;
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: AutocompleteSuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
}

const SuggestionItem = styled.div`
  background: ${(props: any) => (props.active ? theme.euiColorHighlight : 'white')};
  height: calc(48rem / 14);
  margin: 0 ${theme.euiSize};
  border-radius: ${theme.euiSizeXs} ${theme.euiSizeXs} ${theme.euiSizeXs} ${theme.euiSizeXs};
  cursor: pointer;
`;

const SuggestionItemInner = styled.div`
  display: flex;
  align-items: stretch;
  flex-grow: 1;
  align-items: center;
  white-space: nowrap;
`;

const SuggestionItemBase = styled.div`
  flex-grow: 1;
  flex-basis: 0%;
  display: flex;
  flex-direction: column;
`;

const SuggestionItemToken = styled(SuggestionItemBase)`
  color: ${theme.euiColorFullShade};
  flex-grow: 0;
  flex-basis: auto;
  width: ${theme.euiSizeXl};
  height: ${theme.euiSizeXl};
  text-align: center;
  overflow: hidden;
  padding: ${theme.euiSizeXs};
  justify-content: center;
  align-items: center;
`;

const SuggestionItemText = styled(SuggestionItemBase)`
  color: ${theme.euiColorFullShade};
  flex-grow: 0;
  flex-basis: auto;
  font-family: ${theme.euiCodeFontFamily};
  margin-right: ${theme.euiSizeXl};
  width: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: ${theme.euiSizeXs} ${theme.euiSizeS};
  color: #111;
  font-size: ${theme.euiFontSizeS};
`;

const SuggestionItemDescription = styled(SuggestionItemBase)`
  color: ${theme.euiColorDarkShade};
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: ${theme.euiFontSizeXs};
  padding: ${theme.euiSizeXs} ${theme.euiSizeS};
`;

export const SuggestionComponent: SFC<Props> = props => {
  const click = () => props.onClick(props.suggestion);

  // An util function to help highlight the substring which matches the query.
  const renderMatchingText = (text: string) => {
    const index = text.toLowerCase().indexOf(props.query.toLowerCase());
    if (index >= 0) {
      const prefix = text.substring(0, index);
      const highlight = text.substring(index, index + props.query.length);
      const surfix = text.substring(index + props.query.length);
      return (
        <span>
          {prefix}
          <strong>{highlight}</strong>
          {surfix}
        </span>
      );
    } else {
      return text;
    }
  };

  const icon = props.suggestion.tokenType ? (
    <SuggestionItemToken>
      <EuiToken iconType={props.suggestion.tokenType as IconType} />
    </SuggestionItemToken>
  ) : null;

  return (
    <SuggestionItem
      role="option"
      onClick={click}
      active={props.selected}
      onMouseEnter={props.onMouseEnter}
      // @ts-ignore
      ref={props.innerRef}
      id={props.ariaId}
      aria-selected={props.selected}
    >
      <SuggestionItemInner>
        {icon}
        <div>
          <SuggestionItemText data-test-subj={`codeTypeaheadItem`}>
            {renderMatchingText(props.suggestion.text)}
          </SuggestionItemText>
          <SuggestionItemDescription>{props.suggestion.description}</SuggestionItemDescription>
        </div>
      </SuggestionItemInner>
    </SuggestionItem>
  );
};
