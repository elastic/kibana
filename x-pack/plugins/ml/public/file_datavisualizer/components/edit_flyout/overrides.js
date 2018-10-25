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
  EuiTextArea,
} from '@elastic/eui';

import {
  getFormatOptions,
  getTimestampFormatOptions,
  getDelimiterOptions,
  getQuoteOptions,
  // getCharsetOptions,
} from './options';

const formatOptions = getFormatOptions();
const timestampFormatOptions = getTimestampFormatOptions();
const delimiterOptions = getDelimiterOptions();
const quoteOptions = getQuoteOptions();
// const charsetOptions = getCharsetOptions();

export class Overrides extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  static getDerivedStateFromProps(props) {
    const { originalSettings } = props;

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
    } = props.overrides;

    const {
      delimiter: d,
      customDelimiter: customD
    } = convertDelimiter((delimiter === undefined) ? originalSettings.delimiter : delimiter);

    const {
      newColumnNames,
      originalColumnNames
    } = getColumnNames(columnNames, originalSettings);

    return {
      charset: (charset === undefined) ? originalSettings.charset : charset,
      format: (format === undefined) ? originalSettings.format : format,
      hasHeaderRow: (hasHeaderRow === undefined) ? originalSettings.hasHeaderRow : hasHeaderRow,
      columnNames: newColumnNames,
      originalColumnNames,
      delimiter: d,
      customDelimiter: (customD === undefined) ? '' : customD,
      quote: (quote === undefined) ? originalSettings.quote : quote,
      shouldTrimFields: (shouldTrimFields === undefined) ? originalSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: (grokPattern === undefined) ? originalSettings.grokPattern : grokPattern,
      timestampFormat: (timestampFormat === undefined) ? originalSettings.timestampFormat : timestampFormat,
      timestampField: (timestampField === undefined) ? originalSettings.timestampField : timestampField,
    };
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
    delete overrides.originalColumnNames;

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

  grokPatternChange = (e) => {
    this.setState({ grokPattern: e.target.value });
  }


  render() {
    const { fields } = this.props;
    const {
      timestampFormat,
      timestampField,
      format,
      delimiter,
      customDelimiter,
      quote,
      hasHeaderRow,
      shouldTrimFields,
      // charset,
      columnNames,
      originalColumnNames,
      grokPattern,
    } = this.state;

    const fieldOptions = fields.map(f => ({ value: f, inputDisplay: f }));

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
        {
          (this.state.format === 'semi_structured_text') &&
          <React.Fragment>
            <EuiFormRow
              label="Grok pattern"
            >
              <EuiTextArea
                placeholder={grokPattern}
                value={grokPattern}
                onChange={this.grokPatternChange}
              />
            </EuiFormRow>
          </React.Fragment>
        }
        <EuiFormRow
          label="Timestamp format"
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
            options={fieldOptions}
            valueOfSelected={timestampField}
            onChange={this.onTimestampFieldChange}
          />
        </EuiFormRow>

        {/* <EuiFormRow
          label="Charset"
        >
          <EuiSuperSelect
            options={charsetOptions}
            valueOfSelected={charset}
            onChange={this.onCharsetChange}
          />
        </EuiFormRow> */}
        {
          (this.state.format === 'delimited') &&

          <React.Fragment>
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>Edit field names</h3>
            </EuiTitle>

            {
              originalColumnNames.map((f, i) => (
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

// Some delimiter characters cannot be used as items in select list.
// so show a textual description of the character instead.
function convertDelimiter(d) {
  switch (d) {
    case ',':
      return {
        delimiter: 'comma',
      };
    case '\t':
      return {
        delimiter: 'tab',
      };
    case ';':
      return {
        delimiter: 'semicolon',
      };
    case '|':
      return {
        delimiter: 'pipe',
      };
    case ' ':
      return {
        delimiter: 'space',
      };

    default:
      return {
        delimiter: 'other',
        customDelimiter: d,
      };
  }
}

// Convert the delimiter textual descriptions back to their real characters.
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

function getColumnNames(columnNames, originalSettings) {
  const newColumnNames = (columnNames === undefined && originalSettings.columnNames !== undefined) ?
    [...originalSettings.columnNames] : columnNames;

  const originalColumnNames = (newColumnNames !== undefined) ? [...newColumnNames] : [];

  return {
    newColumnNames,
    originalColumnNames,
  };
}
