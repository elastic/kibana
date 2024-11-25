/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { unit } from '../../../../utils/style';
import { transparentize } from 'polished';

function getIconColor(type, euiTheme) {
  switch (type) {
    case 'field':
      return euiTheme.colors.vis.euiColorVis7;
    case 'value':
      return euiTheme.colors.vis.euiColorVis0;
    case 'operator':
      return euiTheme.colors.vis.euiColorVis1;
    case 'conjunction':
      return euiTheme.colors.vis.euiColorVis2;
    case 'recentSearch':
      return euiTheme.colors.textSubdued;
  }
}

const Description = euiStyled.div`
  p {
    display: inline;

    span {
      font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
      padding: 0 ${({ theme }) => theme.eui.euiSizeXS};
      display: inline-block;
    }
  }
`;

const SuggestionItemContainer = euiStyled.div`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  height: ${({ theme }) => theme.eui.euiSizeXL};
  align-items: center;
  display: flex;
  background: ${({ selected, theme }) =>
    selected ? theme.eui.euiColorLightestShade : 'transparent'};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};

  ${Description} {
    p span {
      background: ${({ selected, theme }) =>
        selected ? theme.eui.euiColorEmptyShade : theme.eui.euiColorLightestShade};
    }
  }
`;

const Icon = euiStyled.div`
  flex: 0 0 ${({ theme }) => theme.eui.euiSizeXL};
  background: ${({ type, euiTheme }) => transparentize(0.9, getIconColor(type, euiTheme))};
  color: ${({ type, euiTheme }) => getIconColor(type, euiTheme)};
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: ${({ theme }) => theme.eui.euiSizeXL};
`;

const TextValue = euiStyled.div`
  flex: 0 0 ${unit * 16}px;
  padding: 0 ${({ theme }) => theme.eui.euiSizeS};
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
  const { euiTheme } = useEuiTheme();
  return (
    <SuggestionItemContainer
      selected={props.selected}
      onClick={() => props.onClick(props.suggestion)}
      onMouseEnter={props.onMouseEnter}
    >
      <Icon type={props.suggestion.type} euiTheme={euiTheme}>
        <EuiIcon type={getEuiIconType(props.suggestion.type)} />
      </Icon>
      <TextValue>{props.suggestion.text}</TextValue>
      <Description>{props.suggestion.description}</Description>
    </SuggestionItemContainer>
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
