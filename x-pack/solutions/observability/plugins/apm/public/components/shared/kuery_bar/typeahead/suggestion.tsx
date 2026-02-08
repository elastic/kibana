/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { EuiIcon, useEuiFontSize } from '@elastic/eui';
import type { Theme } from '@emotion/react';
import { unit } from '../../../../utils/style';
import { tint } from 'polished';

export interface QuerySuggestion {
  type: 'field' | 'value' | 'operator' | 'conjunction' | 'recentSearch';
  text: string;
  start: number;
  end: number;
  description?: React.ReactNode;
}

function getIconColor(type: QuerySuggestion['type'], theme: Theme) {
  switch (type) {
    case 'field':
      return theme.euiTheme.colors.vis.euiColorVis7;
    case 'value':
      return theme.euiTheme.colors.vis.euiColorVis0;
    case 'operator':
      return theme.euiTheme.colors.vis.euiColorVis1;
    case 'conjunction':
      return theme.euiTheme.colors.vis.euiColorVis3;
    case 'recentSearch':
      return theme.euiTheme.colors.mediumShade;
  }
}

const Description = styled.div`
  color: ${({ theme }) => theme.euiTheme.colors.darkShade};

  p {
    display: inline;

    span {
      font-family: ${({ theme }) => theme.euiTheme.font.familyCode};
      color: ${({ theme }) => theme.euiTheme.colors.fullShade};
      padding: 0 ${({ theme }) => theme.euiTheme.size.xs};
      display: inline-block;
    }
  }
`;

const ListItem = styled.li<{ selected: boolean }>`
  font-size: ${() => useEuiFontSize('xs').fontSize};
  height: ${({ theme }) => theme.euiTheme.size.xl};
  align-items: center;
  display: flex;
  background: ${({ selected, theme }) =>
    selected ? theme.euiTheme.colors.lightestShade : 'initial'};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.euiTheme.border.radius.small};

  ${Description} {
    p span {
      background: ${({ selected, theme }) =>
        selected ? theme.euiTheme.colors.emptyShade : theme.euiTheme.colors.lightestShade};
    }
  }
`;

const Icon = styled.div<{ type: QuerySuggestion['type'] }>`
  flex: 0 0 ${({ theme }) => theme.euiTheme.size.xl};
  background: ${({ type, theme }) => tint(0.9, getIconColor(type, theme))};
  color: ${({ type, theme }) => getIconColor(type, theme)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${({ theme }) => theme.euiTheme.size.xl};
`;

const TextValue = styled.div`
  flex: 0 0 ${unit * 16}px;
  color: ${({ theme }) => theme.euiTheme.colors.darkestShade};
  padding: 0 ${({ theme }) => theme.euiTheme.size.s};
`;

function getEuiIconType(type: QuerySuggestion['type']) {
  switch (type) {
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
      throw new Error(`Unknown type: ${type}`);
  }
}

interface SuggestionProps {
  innerRef: (node: HTMLLIElement | null) => void;
  selected: boolean;
  suggestion: QuerySuggestion;
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: () => void;
}

function Suggestion({ innerRef, selected, suggestion, onClick, onMouseEnter }: SuggestionProps) {
  return (
    <ListItem
      ref={innerRef}
      selected={selected}
      onClick={() => onClick(suggestion)}
      onMouseEnter={onMouseEnter}
    >
      <Icon type={suggestion.type}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </Icon>
      <TextValue>{suggestion.text}</TextValue>
      <Description>{suggestion.description}</Description>
    </ListItem>
  );
}

export default Suggestion;
