/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { tint } from 'polished';
import React, { Component } from 'react';
import styled from '@emotion/styled';
import { unit } from '../../../../utils/style';
import Suggestion from './suggestion';
import type { QuerySuggestion } from './suggestion';

const List = styled.ul`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.euiTheme.colors.lightShade};
  border-radius: ${({ theme }) => theme.euiTheme.border.radius.small};
  box-shadow: 0
    ${({ theme }) =>
      `${theme.euiTheme.size.xs} ${theme.euiTheme.size.xl} ${tint(
        0.9,
        theme.euiTheme.colors.fullShade
      )}`};
  position: absolute;
  background: ${({ theme }) => theme.euiTheme.colors.emptyShade};
  z-index: 10;
  left: 0;
  max-height: ${unit * 20}px;
  overflow: scroll;
`;

interface SuggestionsProps {
  index: number | null;
  onClick: (suggestion: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show: boolean;
  suggestions: QuerySuggestion[];
}

class Suggestions extends Component<SuggestionsProps> {
  private childNodes: Array<HTMLLIElement | null> = [];
  private parentNode: HTMLUListElement | null = null;

  scrollIntoView = () => {
    const parent = this.parentNode;
    const child = this.props.index != null ? this.childNodes[this.props.index] : null;

    if (this.props.index == null || !parent || !child) {
      return;
    }

    const scrollTop = Math.max(
      Math.min(parent.scrollTop, child.offsetTop),
      child.offsetTop + child.offsetHeight - parent.offsetHeight
    );

    parent.scrollTop = scrollTop;
  };

  componentDidUpdate(prevProps: SuggestionsProps) {
    if (prevProps.index !== this.props.index) {
      this.scrollIntoView();
    }
  }

  render() {
    if (!this.props.show || isEmpty(this.props.suggestions)) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const key = suggestion.text + '_' + index;
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
      <List
        data-test-subj="suggestionContainer"
        ref={(node) => (this.parentNode = node)}
      >
        {suggestions}
      </List>
    );
  }
}

export default Suggestions;
