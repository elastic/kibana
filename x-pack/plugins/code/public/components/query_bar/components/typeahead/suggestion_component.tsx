/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToken, IconType } from '@elastic/eui';
import {
  euiCodeFontFamily,
  euiColorDarkShade,
  euiColorFullShade,
  euiColorLightShade,
  euiFontSizeS,
  euiFontSizeXs,
  euiSize,
  euiSizeS,
  euiSizeXl,
  euiSizeXs,
} from '@elastic/eui/dist/eui_theme_light.json';
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

interface SuggestionItemProps {
  active: boolean;
}

const SuggestionItem = styled.div`
  background: ${(props: SuggestionItemProps) => (props.active ? euiColorLightShade : 'white')};
  height: 48px;
  margin: 0 ${euiSize};
  border-radius: ${euiSizeXs} ${euiSizeXs} ${euiSizeXs} ${euiSizeXs};
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
  color: ${euiColorFullShade};
  flex-grow: 0;
  flex-basis: auto;
  width: ${euiSizeXl};
  height: ${euiSizeXl};
  text-align: center;
  overflow: hidden;
  padding: ${euiSizeXs};
  justify-content: center;
  align-items: center;
`;

const SuggestionItemText = styled(SuggestionItemBase)`
  color: ${euiColorFullShade};
  flex-grow: 0;
  flex-basis: auto;
  font-family: ${euiCodeFontFamily};
  margin-right: ${euiSizeXl};
  width: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: ${euiSizeXs} ${euiSizeS};
  color: #111;
  font-size: ${euiFontSizeS};
`;

const SuggestionItemDescription = styled(SuggestionItemBase)`
  color: ${euiColorDarkShade};
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: ${euiFontSizeXs};
  padding: ${euiSizeXs} ${euiSizeS};
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
      id={props.ariaId}
      aria-selected={props.selected}
    >
      <SuggestionItemInner>
        {icon}
        <div>
          <SuggestionItemText>{renderMatchingText(props.suggestion.text)}</SuggestionItemText>
          <SuggestionItemDescription>{props.suggestion.description}</SuggestionItemDescription>
        </div>
      </SuggestionItemInner>
    </SuggestionItem>
  );
};
