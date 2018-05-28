/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { EuiIcon } from '@elastic/eui';
import { colors } from '../../../../style/variables';

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

function getIconBgColor(type) {
  switch (type) {
    case 'field':
      return '#fccd9f';

    case 'value':
      return '#99dbd7';

    case 'operator':
      return '#accefd';

    case 'conjunction':
      return '#b699d3';

    case 'recentSearch':
      return colors.gray5;
  }
}

const Description = styled.div`
  color: #666;

  p {
    display: inline;

    span {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier,
        monospace;
      color: #000;
      padding: 0 4px;
      display: inline-block;
    }
  }
`;

const ListItem = styled.li`
  font-size: 13px;
  height: 32px;
  align-items: center;
  display: flex;
  background: ${props => (props.selected ? '#eee' : 'initial')};
  cursor: pointer;
  border-radius: 5px;

  ${Description} {
    p span {
      background: ${props => (props.selected ? '#fff' : '#eee')};
    }
  }
`;

const Icon = styled.div`
  flex: 0 0 32px;
  background: ${props => getIconBgColor(props.type)};
  color: ${props => getIconColor(props.type)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: 32px;
`;

const TextValue = styled.div`
  flex: 0 0 250px;
  color: #111;
  padding: 0 8px;
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
      onMouseOver={props.onMouseOver}
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
  onMouseOver: PropTypes.func.isRequired,
  selected: PropTypes.bool,
  suggestion: PropTypes.object.isRequired,
  innerRef: PropTypes.func.isRequired
};

export default Suggestion;
