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
  colors,
  fontFamilyCode,
  px,
  units,
  fontSizes,
  unit
} from '../../../../style/variables';
import { tint } from 'polished';

function getIconColor(type) {
  switch (type) {
    case 'field':
      return colors.apmOrange;
    case 'value':
      return colors.teal;
    case 'operator':
      return colors.apmBlue;
    case 'conjunction':
      return colors.apmPurple;
    case 'recentSearch':
      return colors.gray3;
  }
}

const Description = styled.div`
  color: ${colors.gray2};

  p {
    display: inline;

    span {
      font-family: ${fontFamilyCode};
      color: ${colors.black};
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
  background: ${props => (props.selected ? colors.gray5 : 'initial')};
  cursor: pointer;
  border-radius: ${px(units.quarter)};

  ${Description} {
    p span {
      background: ${props => (props.selected ? colors.white : colors.gray5)};
    }
  }
`;

const Icon = styled.div`
  flex: 0 0 ${px(units.double)};
  background: ${props => tint(0.1, getIconColor(props.type))};
  color: ${props => getIconColor(props.type)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${px(units.double)};
`;

const TextValue = styled.div`
  flex: 0 0 ${px(unit * 16)};
  color: ${colors.black2};
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
      <Description
        dangerouslySetInnerHTML={{ __html: props.suggestion.description }}
      />
    </ListItem>
  );
}

Suggestion.propTypes = {
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  selected: PropTypes.bool,
  suggestion: PropTypes.object.isRequired,
  innerRef: PropTypes.func.isRequired
};

export default Suggestion;
