/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiIcon } from '@elastic/eui';
import { unit } from '../../../../utils/style';
import { tint } from 'polished';

function getIconColor(type, theme) {
  switch (type) {
    case 'field':
      return theme.eui.euiColorVis7;
    case 'value':
      return theme.eui.euiColorVis0;
    case 'operator':
      return theme.eui.euiColorVis1;
    case 'conjunction':
      return theme.eui.euiColorVis3;
    case 'recentSearch':
      return theme.eui.euiColorMediumShade;
  }
}

const Description = euiStyled.div`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};

  p {
    display: inline;

    span {
      font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
      color: ${({ theme }) => theme.eui.euiColorFullShade};
      padding: 0 ${({ theme }) => theme.eui.paddingSizes.xs};
      display: inline-block;
    }
  }
`;

const ListItem = euiStyled.li`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  height: ${({ theme }) => theme.eui.euiSizeXL};
  align-items: center;
  display: flex;
  background: ${({ selected, theme }) =>
    selected ? theme.eui.euiColorLightestShade : 'initial'};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};

  ${Description} {
    p span {
      background: ${({ selected, theme }) =>
        selected
          ? theme.eui.euiColorEmptyShade
          : theme.eui.euiColorLightestShade};
    }
  }
`;

const Icon = euiStyled.div`
  flex: 0 0 ${({ theme }) => theme.eui.euiSizeXL};
  background: ${({ type, theme }) => tint(0.9, getIconColor(type, theme))};
  color: ${({ type, theme }) => getIconColor(type, theme)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${({ theme }) => theme.eui.euiSizeXL};
`;

const TextValue = euiStyled.div`
  flex: 0 0 ${unit * 16}px;
  color: ${({ theme }) => theme.eui.euiColorDarkestShade};
  padding: 0 ${({ theme }) => theme.eui.paddingSizes.s};
`;

function getEuiIconType(type) {
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
      throw new Error('Unknown type', type);
  }
}

function Suggestion(props) {
  return (
    <ListItem
      innerRef={props.innerRef}
      selected={props.selected}
      onClick={() => props.onClick(props.suggestion)}
      onMouseEnter={props.onMouseEnter}
    >
      <Icon type={props.suggestion.type}>
        <EuiIcon type={getEuiIconType(props.suggestion.type)} />
      </Icon>
      <TextValue>{props.suggestion.text}</TextValue>
      <Description>{props.suggestion.description}</Description>
    </ListItem>
  );
}

Suggestion.propTypes = {
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  selected: PropTypes.bool,
  suggestion: PropTypes.object.isRequired,
  innerRef: PropTypes.func.isRequired,
};

export default Suggestion;
