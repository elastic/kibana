/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFieldText } from '@elastic/eui';
import { SINGLE_SELECTION_AS_TEXT_PROPS } from '../../../../../common/constants';
import { IField } from '../../../fields/field';

interface Props {
  dataTestSubj: string;
  field: IField;
  getValueSuggestions: (query: string) => Promise<string[]>;
  onChange: (value: string) => void;
  value: string;
}

interface State {
  suggestions: string[];
  isLoadingSuggestions: boolean;
  hasPrevFocus: boolean;
  fieldDataType: string | null;
  localFieldTextValue: string;
  searchValue?: string;
}

export class StopInput extends Component<Props, State> {
  private _isMounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      suggestions: [],
      isLoadingSuggestions: false,
      hasPrevFocus: false,
      fieldDataType: null,
      localFieldTextValue: props.value,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFieldDataType();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._loadSuggestions.cancel();
  }

  async _loadFieldDataType() {
    const fieldDataType = await this.props.field.getDataType();
    if (this._isMounted) {
      this.setState({ fieldDataType });
    }
  }

  _onFocus = () => {
    if (!this.state.hasPrevFocus) {
      this.setState({ hasPrevFocus: true });
      this._onSearchChange('');
    }
  };

  _onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    this.props.onChange(_.get(selectedOptions, '[0].label', ''));
  };

  _onCreateOption = (newValue: string) => {
    this.props.onChange(newValue);
  };

  _onSearchChange = async (searchValue: string) => {
    this.setState(
      {
        isLoadingSuggestions: true,
        searchValue,
      },
      () => {
        this._loadSuggestions(searchValue);
      }
    );
  };

  _loadSuggestions = _.debounce(async (searchValue: string) => {
    let suggestions: string[] = [];
    try {
      suggestions = await this.props.getValueSuggestions(searchValue);
    } catch (error) {
      // ignore suggestions error
    }

    if (this._isMounted && searchValue === this.state.searchValue) {
      this.setState({
        isLoadingSuggestions: false,
        suggestions,
      });
    }
  }, 300);

  _onFieldTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ localFieldTextValue: event.target.value });
    // onChange can cause UI lag, ensure smooth input typing by debouncing onChange
    this._debouncedOnFieldTextChange();
  };

  _debouncedOnFieldTextChange = _.debounce(() => {
    this.props.onChange(this.state.localFieldTextValue);
  }, 500);

  _renderSuggestionInput() {
    const suggestionOptions = this.state.suggestions.map((suggestion) => {
      return { label: `${suggestion}` };
    });

    const selectedOptions = [];
    if (this.props.value) {
      let option = suggestionOptions.find(({ label }) => {
        return label === this.props.value;
      });
      if (!option) {
        option = { label: this.props.value };
        suggestionOptions.unshift(option);
      }
      selectedOptions.push(option);
    }

    return (
      <EuiComboBox
        options={suggestionOptions}
        selectedOptions={selectedOptions}
        singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
        onChange={this._onChange}
        onSearchChange={this._onSearchChange}
        onCreateOption={this._onCreateOption}
        isClearable={false}
        isLoading={this.state.isLoadingSuggestions}
        onFocus={this._onFocus}
        data-test-subj={this.props.dataTestSubj}
        compressed
      />
    );
  }

  _renderTextInput() {
    return (
      <EuiFieldText
        value={this.state.localFieldTextValue}
        onChange={this._onFieldTextChange}
        compressed
      />
    );
  }

  render() {
    if (!this.state.fieldDataType) {
      return null;
    }

    // autocomplete service can not provide suggestions for non string fields (and boolean) because it uses
    // term aggregation include parameter. Include paramerter uses a regular expressions that only supports string type
    return this.state.fieldDataType === 'string' || this.state.fieldDataType === 'boolean'
      ? this._renderSuggestionInput()
      : this._renderTextInput();
  }
}
