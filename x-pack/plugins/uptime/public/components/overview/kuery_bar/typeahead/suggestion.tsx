/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { EuiIcon } from '@elastic/eui';
import { tint } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import {
  fontFamilyCode,
  px,
  units,
  fontSizes,
  unit,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../apm/public/style/variables';

import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';

function getIconColor(type: string) {
  switch (type) {
    case 'field':
      return theme.euiColorVis7;
    case 'value':
      return theme.euiColorVis0;
    case 'operator':
      return theme.euiColorVis1;
    case 'conjunction':
      return theme.euiColorVis3;
    case 'recentSearch':
      return theme.euiColorMediumShade;
  }
}

const Description = styled.div`
  color: ${theme.euiColorDarkShade};

  p {
    display: inline;

    span {
      font-family: ${fontFamilyCode};
      color: ${theme.euiColorFullShade};
      padding: 0 ${px(units.quarter)};
      display: inline-block;
    }
  }
`;

const ListItem = styled.li<{ selected: boolean }>`
  font-size: ${fontSizes.small};
  height: ${px(units.double)};
  align-items: center;
  display: flex;
  background: ${props => (props.selected ? theme.euiColorLightestShade : 'initial')};
  cursor: pointer;
  border-radius: ${px(units.quarter)};

  ${Description} {
    p span {
      background: ${props =>
        props.selected ? theme.euiColorEmptyShade : theme.euiColorLightestShade};
    }
    @media only screen and (max-width: ${theme.euiBreakpoints.s}) {
      margin-left: auto;
      text-align: end;
    }
  }
`;

const Icon = styled.div<{ type: string }>`
  flex: 0 0 ${px(units.double)};
  background: ${props => tint(0.1, getIconColor(props.type) as string)};
  color: ${props => getIconColor(props.type)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${px(units.double)};
`;

const TextValue = styled.div`
  flex: 0 0 ${px(unit * 12)};
  color: ${theme.euiColorDarkestShade};
  padding: 0 ${px(units.half)};

  @media only screen and (max-width: ${theme.euiBreakpoints.s}) {
    flex: 0 0 ${px(unit * 8)};
  }
  @media only screen and (min-width: 1300px) {
    flex: 0 0 ${px(unit * 16)};
  }
`;

function getEuiIconType(type: string) {
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
      throw new Error(`Unknown type ${type}`);
  }
}

interface SuggestionProps {
  onClick: (sug: QuerySuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: QuerySuggestion;
  innerRef: (node: any) => void;
}

export const Suggestion: React.FC<SuggestionProps> = ({
  innerRef,
  selected,
  suggestion,
  onClick,
  onMouseEnter,
}) => {
  const childNode = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (childNode.current) {
      innerRef(childNode.current);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childNode]);

  return (
    <ListItem
      ref={childNode}
      selected={selected}
      onClick={() => onClick(suggestion)}
      onMouseEnter={onMouseEnter}
    >
      <Icon type={suggestion.type as string}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </Icon>
      <TextValue>{suggestion.text}</TextValue>
      <Description>{suggestion.description}</Description>
    </ListItem>
  );
};
