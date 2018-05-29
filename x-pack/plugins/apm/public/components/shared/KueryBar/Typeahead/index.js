/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Suggestions from './Suggestions';
import ClickOutside from './ClickOutside';
import { fontSizes, units, px } from '../../../../style/variables';

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9
};

const Input = styled.input`
  width: 100%;
  padding: ${px(units.half)};
  font-size: ${fontSizes.large};
  outline: none;
  border-radius: ${px(units.quarter)};
`;

export class Typeahead extends Component {
  state = {
    isSuggestionsVisible: false,
    index: null,
    value: '',
    inputValueChanged: false
  };

  componentDidUpdate(prevProps) {
    if (prevProps.suggestions !== this.props.suggestions) {
      this.setState({ isSuggestionsVisible: true, index: null });
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (!state.inputValueChanged && props.initialValue) {
      return {
        value: props.initialValue
      };
    }

    return null;
  }

  incrementIndex = currentIndex => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.props.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  decrementIndex = currentIndex => {
    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }
    this.setState({ index: previousIndex });
  };

  onKeyUp = event => {
    const { selectionStart } = event.target;
    const { value } = this.state;
    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        this.setState({ isSuggestionsVisible: true });
        this.props.onChange(value, selectionStart);
        break;
      case KEY_CODES.RIGHT:
        this.setState({ isSuggestionsVisible: true });
        this.props.onChange(value, selectionStart);
        break;
    }
  };

  onKeyDown = event => {
    const { isSuggestionsVisible, index, value } = this.state;
    switch (event.keyCode) {
      case KEY_CODES.DOWN:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.incrementIndex(index);
        } else {
          this.setState({ isSuggestionsVisible: true, index: 0 });
        }
        break;
      case KEY_CODES.UP:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.decrementIndex(index);
        }
        break;
      case KEY_CODES.ENTER:
        event.preventDefault();
        if (isSuggestionsVisible && this.props.suggestions[index]) {
          this.selectSuggestion(this.props.suggestions[index]);
        } else {
          this.setState({ isSuggestionsVisible: false });
          this.props.onSubmit(value);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();
        this.setState({ isSuggestionsVisible: false });
        break;
      case KEY_CODES.TAB:
        this.setState({ isSuggestionsVisible: false });
        break;
    }
  };

  selectSuggestion = suggestion => {
    const nextInput =
      this.state.value.substr(0, suggestion.start) +
      suggestion.text +
      this.state.value.substr(suggestion.end);

    this.setState({ value: nextInput, isSuggestionsVisible: false });
    this.props.onChange(nextInput, nextInput.length);
  };

  onClickOutside = () => {
    this.setState({ isSuggestionsVisible: false });
  };

  onChangeInputValue = event => {
    const { value, selectionStart } = event.target;
    this.setState({ value, inputValueChanged: true });
    this.props.onChange(value, selectionStart);
  };

  onClickInput = event => {
    const { selectionStart } = event.target;
    this.setState({ isSuggestionsVisible: true });
    this.props.onChange(this.state.value, selectionStart);
  };

  onMouseLeaveSuggestions = () => {
    this.setState({ index: null });
  };

  onClickSuggestion = suggestion => {
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  onMouseOverSuggestion = index => {
    this.setState({ index });
  };

  render() {
    return (
      <ClickOutside
        onClickOutside={this.onClickOutside}
        style={{ position: 'relative' }}
      >
        <Input
          innerRef={node => (this.inputRef = node)}
          type="text"
          value={this.state.value}
          onKeyDown={this.onKeyDown}
          onKeyUp={this.onKeyUp}
          onChange={this.onChangeInputValue}
          onClick={this.onClickInput}
          autoComplete="off"
          spellCheck={false}
        />
        <Suggestions
          show={this.state.isSuggestionsVisible}
          suggestions={this.props.suggestions}
          index={this.state.index}
          onClick={this.onClickSuggestion}
          onMouseOver={this.onMouseOverSuggestion}
          onMouseLeave={this.onMouseLeaveSuggestions}
        />
      </ClickOutside>
    );
  }
}

Typeahead.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  suggestions: PropTypes.array.isRequired,
  initialValue: PropTypes.string
};

Typeahead.defaultProps = {
  suggestions: []
};
