/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { EuiIcon } from '@elastic/eui';
import {
  fontFamilyCode,
  px,
  units,
  fontSizes,
  unit,
} from '../../../../style/variables';
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

const Description = styled.div`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};

  p {
    display: inline;

    span {
      font-family: ${fontFamilyCode};
      color: ${({ theme }) => theme.eui.euiColorFullShade};
      padding: 0 ${px(units.quarter)};
      display: inline-block;
    }
  }
`;

const ListItem = styled.li`
  font-size: ${fontSizes.small};
  height: ${px(units.double)};
  align-items: center;
  display: flex;
  background: ${({ selected, theme }) =>
    selected ? theme.eui.euiColorLightestShade : 'initial'};
  cursor: pointer;
  border-radius: ${px(units.quarter)};

  ${Description} {
    p span {
      background: ${({ selected, theme }) =>
        selected
          ? theme.eui.euiColorEmptyShade
          : theme.eui.euiColorLightestShade};
    }
  }
`;

const Icon = styled.div`
  flex: 0 0 ${px(units.double)};
  background: ${({ type, theme }) => tint(0.1, getIconColor(type, theme))};
  color: ${({ type, theme }) => getIconColor(type, theme)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${px(units.double)};
`;

const TextValue = styled.div`
  flex: 0 0 ${px(unit * 16)};
  color: ${({ theme }) => theme.eui.euiColorDarkestShade};
  padding: 0 ${px(units.half)};
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
