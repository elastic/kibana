/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiTextArea, EuiFormRow, EuiTitle } from '@elastic/eui';
import { debounce, startCase } from 'lodash';
import { Autocomplete } from '../autocomplete';
import {
  getAutocompleteSuggestions,
  getFnArgDefAtPosition,
} from '../../../common/lib/autocomplete';
import { FunctionReference } from './function_reference';
import { ArgumentReference } from './argument_reference';

export class ExpressionInput extends React.Component {
  constructor({ value }) {
    super();

    this.undoHistory = [];
    this.redoHistory = [];

    this.state = {
      selection: {
        start: value.length,
        end: value.length,
      },
      suggestions: [],
    };
  }

  componentDidUpdate() {
    if (!this.ref) return;
    const { selection } = this.state;
    const { start, end } = selection;
    this.ref.setSelectionRange(start, end);
  }

  undo() {
    if (!this.undoHistory.length) return;
    const value = this.undoHistory.pop();
    this.redoHistory.push(this.props.value);
    this.props.onChange(value);
  }

  redo() {
    if (!this.redoHistory.length) return;
    const value = this.redoHistory.pop();
    this.undoHistory.push(this.props.value);
    this.props.onChange(value);
  }

  stash = debounce(
    value => {
      this.undoHistory.push(value);
      this.redoHistory = [];
    },
    500,
    { leading: true, trailing: false }
  );

  onKeyDown = e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      }
      if (e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    }
  };

  onSuggestionSelect = item => {
    const { text, start, end } = item;
    const value = this.props.value.substr(0, start) + text + this.props.value.substr(end);
    const selection = { start: start + text.length, end: start + text.length };
    this.updateState({ value, selection });

    // This is needed for when the suggestion was selected by clicking on it
    this.ref.focus();
  };

  onChange = e => {
    const { target } = e;
    const { value, selectionStart, selectionEnd } = target;
    const selection = {
      start: selectionStart,
      end: selectionEnd,
    };
    this.updateState({ value, selection });
  };

  updateState = ({ value, selection }) => {
    this.stash(this.props.value);
    const suggestions = getAutocompleteSuggestions(
      this.props.functionDefinitions,
      value,
      selection.start
    );
    this.props.onChange(value);
    this.setState({ selection, suggestions });
  };

  getHeader = () => {
    const { suggestions } = this.state;
    if (!suggestions.length) return '';
    return (
      <EuiTitle className="autocompleteType" size="xs">
        <h3>{startCase(suggestions[0].type)}</h3>
      </EuiTitle>
    );
  };

  getReference = selectedItem => {
    const { fnDef, argDef } = selectedItem || {};
    if (argDef) return <ArgumentReference argDef={argDef} />;
    if (fnDef) return <FunctionReference fnDef={fnDef} />;

    const { fnDef: fnDefAtPosition, argDef: argDefAtPosition } = getFnArgDefAtPosition(
      this.props.functionDefinitions,
      this.props.value,
      this.state.selection.start
    );

    if (argDefAtPosition) return <ArgumentReference argDef={argDefAtPosition} />;
    if (fnDefAtPosition) return <FunctionReference fnDef={fnDefAtPosition} />;

    return '';
  };

  render() {
    const { value, error } = this.props;
    const { suggestions } = this.state;

    const helpText = error
      ? null
      : 'This is the coded expression that backs this element. You better know what you are doing here.';
    return (
      <div className="expressionInput">
        <EuiFormRow fullWidth isInvalid={Boolean(error)} error={error} helpText={helpText}>
          <Autocomplete
            header={this.getHeader()}
            items={suggestions}
            onSelect={this.onSuggestionSelect}
            reference={this.getReference}
          >
            <EuiTextArea
              onKeyDown={this.onKeyDown}
              className="canvasTextArea--code"
              value={value}
              onChange={this.onChange}
              inputRef={ref => (this.ref = ref)}
              spellcheck="false"
            />
          </Autocomplete>
        </EuiFormRow>
      </div>
    );
  }
}

ExpressionInput.propTypes = {
  functionDefinitions: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
};
