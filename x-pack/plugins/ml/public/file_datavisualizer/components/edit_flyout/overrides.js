/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSuperSelect,
  EuiCheckbox,
} from '@elastic/eui';

import {
  formatOptions,
  timestampFormatOptions,
  delimiterOptions,
  quoteOptions,
  charsetOptions,
} from './options';

export class Overrides extends Component {
  constructor(props) {
    super(props);

    this.defaultSettings = this.props.defaultSettings;
    this.overrides = this.props.overrides;

    const {
      charset,
      format,
      hasHeaderRow,
      columnNames,
      delimiter,
      quote,
      shouldTrimFields,
      grokPattern,
      timestampField,
      timestampFormat,
    } = this.overrides;

    const {
      delimiter: d,
      customDelimiter: customD
    } = convertDelimiter((delimiter === null) ? this.defaultSettings.delimiter : delimiter);

    this.state = {
      charset: (charset === null) ? this.defaultSettings.charset : charset,
      format: (format === null) ? this.defaultSettings.format : format,
      hasHeaderRow: (hasHeaderRow === null) ? this.defaultSettings.hasHeaderRow : hasHeaderRow,
      columnNames: (columnNames === null) ? this.defaultSettings.columnNames : columnNames,
      delimiter: d,
      customDelimiter: customD,
      quote: (quote === null) ? this.defaultSettings.quote : quote,
      shouldTrimFields: (shouldTrimFields === null) ? this.defaultSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: (grokPattern === null) ? this.defaultSettings.grokPattern : grokPattern,
      timestampFormat: (timestampFormat === null) ? this.defaultSettings.timestampFormat : timestampFormat,
      timestampField: (timestampField === null) ? this.defaultSettings.timestampField : timestampField,
    };

    this.fields = this.props.fields;
    this.fieldOptions = this.fields.map(f => ({ value: f, inputDisplay: f }));

    console.log(this.state);
  }

  componentDidMount() {
    if (typeof this.props.setApplyOverrides === 'function') {
      this.props.setApplyOverrides(this.applyOverrides);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetApplyOverrides === 'function') {
      this.props.unsetApplyOverrides();
    }
  }

  applyOverrides = () => {
    const overrides = { ...this.state };
    overrides.delimiter = convertDelimiterBack(overrides);
    delete overrides.customDelimiter;

    this.props.setOverrides(overrides);
  }

  onTimestampFormatChange = (timestampFormat) => {
    this.setState({ timestampFormat });
  }

  onTimestampFieldChange = (timestampField) => {
    this.setState({ timestampField });
  }

  onFormatChange = (format) => {
    this.setState({ format });
  }

  onDelimiterChange = (delimiter) => {
    this.setState({ delimiter });
  }

  onCustomDelimiterChange = (e) => {
    this.setState({ customDelimiter: e.target.value });
  }

  onHasHeaderRowChange = (e) => {
    this.setState({ hasHeaderRow: e.target.checked });
  }

  onShouldTrimFieldsChange = (e) => {
    this.setState({ shouldTrimFields: e.target.checked });
  }

  onCharsetChange = (charset) => {
    this.setState({ charset });
  }

  render() {
    const {
      timestampFormat,
      timestampField,
      format,
      delimiter,
      customDelimiter,
      quote,
      hasHeaderRow,
      shouldTrimFields,
      charset,
    } = this.state;

    return (

      <EuiForm>
        <EuiFormRow
          label="Data format"
          // helpText="I am some friendly help text."
        >
          <EuiSuperSelect
            options={formatOptions}
            valueOfSelected={format}
            onChange={this.onFormatChange}
          />
        </EuiFormRow>
        {
          (this.state.format === 'delimited') &&
          <React.Fragment>
            <EuiFormRow
              label="Delimiter"
              // helpText="I am some friendly help text."
            >
              <EuiSuperSelect
                options={delimiterOptions}
                valueOfSelected={delimiter}
                onChange={this.onDelimiterChange}
              />
            </EuiFormRow>
            {
              (delimiter === 'other') &&
              <EuiFormRow
                label="Custom delimiter"
                // helpText="I am some friendly help text."
              >
                <EuiFieldText
                  value={customDelimiter}
                  onChange={this.onCustomDelimiterChange}
                />
              </EuiFormRow>
            }

            <EuiFormRow
              label="Quote character"
              // helpText="I am some friendly help text."
            >
              <EuiSuperSelect
                options={quoteOptions}
                valueOfSelected={quote}
                onChange={this.onDelimiterChange}
              />
            </EuiFormRow>


            <EuiFormRow>
              <EuiCheckbox
                id={'hasHeaderRow'}
                label="Has header row"
                checked={hasHeaderRow}
                onChange={this.onHasHeaderRowChange}
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiCheckbox
                id={'shouldTrimFields'}
                label="Should trim fields"
                checked={shouldTrimFields}
                onChange={this.onShouldTrimFieldsChange}
              />
            </EuiFormRow>

          </React.Fragment>
        }
        <EuiFormRow
          label="Time stamp format"
          // helpText="I am some friendly help text."
        >
          <EuiSuperSelect
            options={timestampFormatOptions}
            valueOfSelected={timestampFormat}
            onChange={this.onTimestampFormatChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Time field"
          // helpText="I am some friendly help text."
        >
          <EuiSuperSelect
            options={this.fieldOptions}
            valueOfSelected={timestampField}
            onChange={this.onTimestampFieldChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label="charset"
          // helpText="I am some friendly help text."
        >
          <EuiSuperSelect
            options={charsetOptions}
            valueOfSelected={charset}
            onChange={this.onCharsetChange}
          />
        </EuiFormRow>
      </EuiForm>

    );
  }
}

function convertDelimiter(d) {
  switch (d) {
    case ',':
      return {
        delimiter: 'comma',
        customDelimiter: ''
      };

    default:
      return {
        delimiter: 'comma', // default to comma
        customDelimiter: ''
      };
  }
}

function convertDelimiterBack({ delimiter, customDelimiter }) {
  switch (delimiter) {
    case 'comma':
      return ',';
    case 'other':
      return customDelimiter;

    default:
      return null;
  }
}
