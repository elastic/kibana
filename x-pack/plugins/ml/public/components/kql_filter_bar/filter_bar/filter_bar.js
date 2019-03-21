/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Suggestions } from '../suggestions';
import { ClickOutside } from '../click_outside';
import { EuiFieldSearch, EuiProgress, keyCodes } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export class FilterBar extends Component {
  state = {
    isSuggestionsVisible: false,
    index: null,
    value: '',
    inputIsPristine: true
  };

  static getDerivedStateFromProps(props, state) {
    if (state.inputIsPristine && props.initialValue) {
      return {
        value: props.initialValue
      };
    }

    return null;
  }

  // Set value to filter created via filter table
  componentDidUpdate(oldProps) {
    const newProps = this.props;
    if (oldProps.valueExternal !== newProps.valueExternal) {
      this.setState({ value: newProps.valueExternal, index: null });
    }
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
      case keyCodes.LEFT:
      case keyCodes.RIGHT:
        this.setState({ isSuggestionsVisible: true });
        this.props.onChange(value, selectionStart);
        break;
    }
  };

  onKeyDown = event => {
    const { isSuggestionsVisible, index, value } = this.state;
    switch (event.keyCode) {
      case keyCodes.DOWN:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.incrementIndex(index);
        } else {
          this.setState({ isSuggestionsVisible: true, index: 0 });
        }
        break;
      case keyCodes.UP:
        event.preventDefault();
        if (isSuggestionsVisible) {
          this.decrementIndex(index);
        }
        break;
      case keyCodes.ENTER:
        event.preventDefault();
        if (isSuggestionsVisible && this.props.suggestions[index]) {
          this.selectSuggestion(this.props.suggestions[index]);
        } else {
          this.setState({ isSuggestionsVisible: false });
          this.props.onSubmit(value);
        }
        break;
      case keyCodes.ESC:
        event.preventDefault();
        this.setState({ isSuggestionsVisible: false });
        break;
      case keyCodes.TAB:
        this.setState({ isSuggestionsVisible: false });
        break;
    }
  };

  selectSuggestion = suggestion => {
    const nextInputValue =
      this.state.value.substr(0, suggestion.start) +
      suggestion.text +
      this.state.value.substr(suggestion.end);

    this.setState({ value: nextInputValue, index: null });
    this.props.onChange(nextInputValue, nextInputValue.length);
  };

  onClickOutside = () => {
    this.setState({ isSuggestionsVisible: false });
  };

  onChangeInputValue = event => {
    const { value, selectionStart } = event.target;
    const hasValue = Boolean(value.trim());
    this.setState({
      value,
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null
    });

    if (!hasValue) {
      this.props.onSubmit(value);
    }
    this.props.onChange(value, selectionStart);
  };

  onClickInput = event => {
    const { selectionStart } = event.target;
    this.props.onChange(this.state.value, selectionStart);
  };

  onClickSuggestion = suggestion => {
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  onMouseEnterSuggestion = index => {
    this.setState({ index });
  };

  onSubmit = () => {
    this.props.onSubmit(this.state.value);
    this.setState({ isSuggestionsVisible: false });
  };

  render() {
    const { disabled } = this.props;
    const { value } = this.state;

    return (
      <ClickOutside
        onClickOutside={this.onClickOutside}
        style={{ position: 'relative' }}
      >
        <div style={{ position: 'relative' }}>
          <EuiFieldSearch
            fullWidth
            style={{
              backgroundImage: 'none'
            }}
            placeholder={i18n.translate(
              'xpack.ml.explorer.kueryBar.filterPlaceholder',
              {
                defaultMessage:
                  'Filter by influencer fields… (E.g. {queryExample})',
                values: {
                  queryExample:
                    `${this.props.placeholder}`
                }
              }
            )}
            inputRef={node => {
              if (node) {
                this.inputRef = node;
              }
            }}
            disabled={disabled}
            value={value}
            onKeyDown={this.onKeyDown}
            onKeyUp={this.onKeyUp}
            onChange={this.onChangeInputValue}
            onClick={this.onClickInput}
            autoComplete="off"
            spellCheck={false}
          />

          {this.props.isLoading && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              style={{
                bottom: 0,
                top: 'initial'
              }}
            />
          )}
        </div>

        <Suggestions
          show={this.state.isSuggestionsVisible}
          suggestions={this.props.suggestions}
          index={this.state.index}
          onClick={this.onClickSuggestion}
          onMouseEnter={this.onMouseEnterSuggestion}
        />
      </ClickOutside>
    );
  }
}

FilterBar.propTypes = {
  initialValue: PropTypes.string,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  valueExternal: PropTypes.string,
  suggestions: PropTypes.array.isRequired
};

FilterBar.defaultProps = {
  isLoading: false,
  disabled: false,
  placeholder: 'tag : engineering OR tag : marketing',
  suggestions: []
};
