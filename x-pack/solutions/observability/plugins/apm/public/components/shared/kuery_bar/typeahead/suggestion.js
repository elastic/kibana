/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { EuiIcon, useEuiFontSize } from '@elastic/eui';
import { unit } from '../../../../utils/style';
import { tint } from 'polished';

function getIconColor(type, theme) {
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

const ListItem = styled.li`
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

const Icon = styled.div`
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
