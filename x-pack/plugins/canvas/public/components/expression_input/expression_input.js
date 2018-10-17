/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { ContextMenu } from '../context_menu';
import { matchPairsProvider } from './match_pairs';
import { Suggestion } from './suggestion';

export class ExpressionInput extends React.Component {
  constructor({ value, onChange }) {
    super();
    this.state = {
      selection: {
        start: value.length,
        end: value.length,
      },
      suggestions: [],
    };

    this.matchPairs = matchPairsProvider({
      setValue: onChange,
      setSelection: selection => this.setState({ selection }),
    });
  }

  componentDidUpdate() {
    if (!this.ref) return;
    const { selection } = this.state;
    const { start, end } = selection;
    this.ref.setSelectionRange(start, end);
  }

  onChange = e => {
    const { target } = e;
    const { value, selectionStart, selectionEnd } = target;
    const selection = {
      start: selectionStart,
      end: selectionEnd,
    };
    this.updateState({ value, selection });
  };

  onSuggestionSelect = suggestion => {
    const value =
      this.props.value.substr(0, suggestion.location.start) +
      suggestion.value +
      this.props.value.substr(suggestion.location.end);
    const selection = {
      start: suggestion.location.start + suggestion.value.length,
      end: suggestion.location.start + suggestion.value.length,
    };
    this.updateState({ value, selection });
  };

  updateState = ({ value, selection }) => {
    const suggestions = [];
    this.props.onChange(value);
    this.setState({ selection, suggestions });
  };

  // TODO: Use a hidden div and measure it rather than using hardcoded values
  getContextMenuItemsStyle = () => {
    const { value } = this.props;
    const {
      selection: { end },
    } = this.state;
    const numberOfNewlines = value.substr(0, end).split('\n').length;
    const padding = 12;
    const lineHeight = 22;
    const textareaHeight = 200;
    const top = Math.min(padding + numberOfNewlines * lineHeight, textareaHeight) + 'px';
    return { top };
  };

  render() {
    const { value, error } = this.props;
    const { suggestions } = this.state;

    const helpText = error
      ? null
      : 'This is the coded expression that backs this element. You better know what you are doing here.';
    return (
      <div className="expressionInput">
        <ContextMenu
          items={suggestions}
          onSelect={this.onSuggestionSelect}
          itemsStyle={this.getContextMenuItemsStyle()}
          itemComponent={Suggestion}
        >
          <EuiFormRow fullWidth isInvalid={Boolean(error)} error={error} helpText={helpText}>
            <EuiTextArea
              className="canvasTextArea--code"
              value={value}
              onKeyDown={this.matchPairs}
              onChange={this.onChange}
              inputRef={ref => (this.ref = ref)}
            />
          </EuiFormRow>
        </ContextMenu>
      </div>
    );
  }
}

ExpressionInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
};
