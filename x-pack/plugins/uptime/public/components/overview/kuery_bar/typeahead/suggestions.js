/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import Suggestion from './suggestion';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { units, px, unit } from '../../../../../../apm/public/style/variables';
import { tint } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';

const List = styled.ul`
  width: 100%;
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${px(units.quarter)};
  box-shadow: 0px ${px(units.quarter)} ${px(units.double)} ${tint(0.1, theme.euiColorFullShade)};
  position: absolute;
  background: #fff;
  z-index: 10;
  left: 0;
  max-height: ${px(unit * 20)};
  overflow: scroll;
`;

class Suggestions extends Component {
  childNodes = [];

  scrollIntoView = () => {
    const parent = this.parentNode;
    const child = this.childNodes[this.props.index];

    if (this.props.index == null || !parent || !child) {
      return;
    }

    const scrollTop = Math.max(
      Math.min(parent.scrollTop, child.offsetTop),
      child.offsetTop + child.offsetHeight - parent.offsetHeight
    );

    parent.scrollTop = scrollTop;
  };

  handleScroll = () => {
    const parent = this.parentNode;

    if (!this.props.loadMore || !parent) {
      return;
    }

    const position = parent.scrollTop + parent.offsetHeight;
    const height = parent.scrollHeight;
    const remaining = height - position;
    const margin = 50;

    if (!height || !position) {
      return;
    }
    if (remaining <= margin) {
      this.props.loadMore();
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.index !== this.props.index) {
      this.scrollIntoView();
    }
  }

  render() {
    if (!this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const key = suggestion + '_' + index;
      return (
        <Suggestion
          innerRef={(node) => (this.childNodes[index] = node)}
          selected={index === this.props.index}
          suggestion={suggestion}
          onClick={this.props.onClick}
          onMouseEnter={() => this.props.onMouseEnter(index)}
          key={key}
        />
      );
    });

    return (
      <List ref={(node) => (this.parentNode = node)} onScroll={this.handleScroll}>
        {suggestions}
      </List>
    );
  }
}

Suggestions.propTypes = {
  index: PropTypes.number,
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  show: PropTypes.bool,
  suggestions: PropTypes.array.isRequired,
  loadMore: PropTypes.func.isRequired,
};

export default Suggestions;
