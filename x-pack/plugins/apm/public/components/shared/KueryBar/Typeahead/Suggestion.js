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
  unit
} from '../../../../style/variables';
import { tint } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';

function getIconColor(type) {
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

const ListItem = styled.li`
  font-size: ${fontSizes.small};
  height: ${px(units.double)};
  align-items: center;
  display: flex;
  background: ${props =>
    props.selected ? theme.euiColorLightestShade : 'initial'};
  cursor: pointer;
  border-radius: ${px(units.quarter)};

  ${Description} {
    p span {
      background: ${props =>
        props.selected
          ? theme.euiColorEmptyShade
          : theme.euiColorLightestShade};
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
  color: ${theme.euiColorDarkestShade};
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
