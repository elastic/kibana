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
  EuiSpacer,
  EuiTitle,
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

    this.originalSettings = this.props.originalSettings;
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
    } = convertDelimiter((delimiter === undefined) ? this.originalSettings.delimiter : delimiter);

    const tempColumnNames = (columnNames === undefined && this.originalSettings.columnNames !== undefined) ?
      [...this.originalSettings.columnNames] : columnNames;

    this.state = {
      charset: (charset === undefined) ? this.originalSettings.charset : charset,
      format: (format === undefined) ? this.originalSettings.format : format,
      hasHeaderRow: (hasHeaderRow === undefined) ? this.originalSettings.hasHeaderRow : hasHeaderRow,
      columnNames: tempColumnNames,
      delimiter: d,
      customDelimiter: customD,
      quote: (quote === undefined) ? this.originalSettings.quote : quote,
      shouldTrimFields: (shouldTrimFields === undefined) ? this.originalSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: (grokPattern === undefined) ? this.originalSettings.grokPattern : grokPattern,
      timestampFormat: (timestampFormat === undefined) ? this.originalSettings.timestampFormat : timestampFormat,
      timestampField: (timestampField === undefined) ? this.originalSettings.timestampField : timestampField,
    };

    this.fields = this.props.fields;
    this.fieldOptions = this.fields.map(f => ({ value: f, inputDisplay: f }));
    this.originalColumnNames = (this.state.columnNames !== undefined) ? [...this.state.columnNames] : [];

    console.log('Overrides constructor', this.state);
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

  onFormatChange = (format) => {
    this.setState({ format });
  }

  onTimestampFormatChange = (timestampFormat) => {
    this.setState({ timestampFormat });
  }

  onTimestampFieldChange = (timestampField) => {
    this.setState({ timestampField });
  }

  onDelimiterChange = (delimiter) => {
    this.setState({ delimiter });
  }

  onCustomDelimiterChange = (e) => {
    this.setState({ customDelimiter: e.target.value });
  }

  onQuoteChange = (quote) => {
    this.setState({ quote });
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

  onColumnNameChange = (e, i) => {
    const columnNames = this.state.columnNames;
    columnNames[i] = e.target.value;
    this.setState({ columnNames });
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
      columnNames,
    } = this.state;

    return (

      <EuiForm>
        <EuiFormRow
          label="Data format"
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
              >
                <EuiFieldText
                  value={customDelimiter}
                  onChange={this.onCustomDelimiterChange}
                />
              </EuiFormRow>
            }

            <EuiFormRow
              label="Quote character"
            >
              <EuiSuperSelect
                options={quoteOptions}
                valueOfSelected={quote}
                onChange={this.onQuoteChange}
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
        >
          <EuiSuperSelect
            options={timestampFormatOptions}
            valueOfSelected={timestampFormat}
            onChange={this.onTimestampFormatChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Time field"
        >
          <EuiSuperSelect
            options={this.fieldOptions}
            valueOfSelected={timestampField}
            onChange={this.onTimestampFieldChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label="charset"
        >
          <EuiSuperSelect
            options={charsetOptions}
            valueOfSelected={charset}
            onChange={this.onCharsetChange}
          />
        </EuiFormRow>
        {
          (this.state.format === 'delimited') &&

          <React.Fragment>
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>Edit field names</h3>
            </EuiTitle>

            {
              this.originalColumnNames.map((f, i) => (
                <EuiFormRow
                  label={f}
                  key={f}
                >
                  <EuiFieldText
                    value={columnNames[i]}
                    onChange={(e) => this.onColumnNameChange(e, i)}
                  />
                </EuiFormRow>
              ))
            }
          </React.Fragment>
        }

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
    case '\t':
      return {
        delimiter: 'tab',
        customDelimiter: ''
      };
    case ';':
      return {
        delimiter: 'semicolon',
        customDelimiter: ''
      };
    case '|':
      return {
        delimiter: 'pipe',
        customDelimiter: ''
      };
    case ' ':
      return {
        delimiter: 'space',
        customDelimiter: ''
      };

    default:
      return {
        delimiter: undefined,
        customDelimiter: ''
      };
  }
}

function convertDelimiterBack({ delimiter, customDelimiter }) {
  switch (delimiter) {
    case 'comma':
      return ',';
    case 'tab':
      return '\t';
    case 'semicolon':
      return ';';
    case 'pipe':
      return '|';
    case 'space':
      return ' ';
    case 'other':
      return customDelimiter;

    default:
      return undefined;
  }
}
