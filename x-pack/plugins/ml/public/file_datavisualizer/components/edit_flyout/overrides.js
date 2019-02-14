/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
  EuiFieldNumber,
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

const LINES_TO_SAMPLE_VALUE_MIN = 3;
const LINES_TO_SAMPLE_VALUE_MAX = 1000000;

export class Overrides extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  linesToSampleErrors = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.linesToSampleErrorMessage', {
    defaultMessage: 'Value must be greater than {min} and less than or equal to {max}',
    values: {
      min: LINES_TO_SAMPLE_VALUE_MIN,
      max: LINES_TO_SAMPLE_VALUE_MAX,
    }
  });

  static getDerivedStateFromProps(props, state) {
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
      linesToSample,
    } = props.overrides;

    const {
      delimiter: d,
      customDelimiter: customD
    } = convertDelimiter((delimiter === undefined) ? originalSettings.delimiter : delimiter);

    const {
      newColumnNames,
      originalColumnNames
    } = getColumnNames(columnNames, originalSettings);

    const overrides =  {
      charset: (charset === undefined) ? originalSettings.charset : charset,
      format: (format === undefined) ? originalSettings.format : format,
      hasHeaderRow: (hasHeaderRow === undefined) ? originalSettings.hasHeaderRow : hasHeaderRow,
      columnNames: newColumnNames,
      delimiter: d,
      quote: (quote === undefined) ? originalSettings.quote : quote,
      shouldTrimFields: (shouldTrimFields === undefined) ? originalSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: (grokPattern === undefined) ? originalSettings.grokPattern : grokPattern,
      timestampFormat: (timestampFormat === undefined) ? originalSettings.timestampFormat : timestampFormat,
      timestampField: (timestampField === undefined) ? originalSettings.timestampField : timestampField,
      linesToSample: (linesToSample === undefined) ? originalSettings.linesToSample : +linesToSample,
    };

    return {
      originalColumnNames,
      customDelimiter: (customD === undefined) ? '' : customD,
      linesToSampleValid: true,
      overrides,
      ...state,
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
    const overrides = { ...this.state.overrides };
    overrides.delimiter = convertDelimiterBack(overrides.delimiter, this.state.customDelimiter);

    this.props.setOverrides(overrides);
  }

  setOverride(o) {
    const overrides = { ...this.state.overrides, ...o };
    this.setState({ overrides });
  }

  onFormatChange = (format) => {
    this.setOverride({ format });
  }

  onTimestampFormatChange = (timestampFormat) => {
    this.setOverride({ timestampFormat });
  }

  onTimestampFieldChange = (timestampField) => {
    this.setOverride({ timestampField });
  }

  onDelimiterChange = (delimiter) => {
    this.setOverride({ delimiter });
  }

  onCustomDelimiterChange = (e) => {
    this.setState({ customDelimiter: e.target.value });
  }

  onQuoteChange = (quote) => {
    this.setOverride({ quote });
  }

  onHasHeaderRowChange = (e) => {
    this.setOverride({ hasHeaderRow: e.target.checked });
  }

  onShouldTrimFieldsChange = (e) => {
    this.setOverride({ shouldTrimFields: e.target.checked });
  }

  onCharsetChange = (charset) => {
    this.setOverride({ charset });
  }

  onColumnNameChange = (e, i) => {
    const columnNames = this.state.overrides.columnNames;
    columnNames[i] = e.target.value;
    this.setOverride({ columnNames });
  }

  grokPatternChange = (e) => {
    this.setOverride({ grokPattern: e.target.value });
  }

  onLinesToSampleChange = (e) => {
    const linesToSample = +e.target.value;
    this.setOverride({ linesToSample });

    // check whether the value is valid and set that to state.
    const linesToSampleValid = isLinesToSampleValid(linesToSample);
    this.setState({ linesToSampleValid });

    // set the overrides valid setting in the parent component,
    // used to disable the Apply button if any of the overrides are invalid
    this.props.setOverridesValid(linesToSampleValid);
  }


  render() {
    const { fields } = this.props;
    const {
      customDelimiter,
      originalColumnNames,
      linesToSampleValid,
      overrides,
    } = this.state;

    const {
      timestampFormat,
      timestampField,
      format,
      delimiter,
      quote,
      hasHeaderRow,
      shouldTrimFields,
      // charset,
      columnNames,
      grokPattern,
      linesToSample,
    } = overrides;

    const fieldOptions = fields.map(f => ({ value: f, inputDisplay: f }));

    return (

      <EuiForm>
        <EuiFormRow
          error={this.linesToSampleErrors}
          isInvalid={(linesToSampleValid === false)}
          label={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.editFlyout.overrides.linesToSampleFormRowLabel"
              defaultMessage="Number of lines to sample"
            />
          }
        >
          <EuiFieldNumber
            value={linesToSample}
            onChange={this.onLinesToSampleChange}
            isInvalid={(linesToSampleValid === false)}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.editFlyout.overrides.dataFormatFormRowLabel"
              defaultMessage="Data format"
            />
          }
        >
          <EuiSuperSelect
            options={formatOptions}
            valueOfSelected={format}
            onChange={this.onFormatChange}
          />
        </EuiFormRow>
        {
          (format === 'delimited') &&
          <React.Fragment>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.editFlyout.overrides.delimiterFormRowLabel"
                  defaultMessage="Delimiter"
                />
              }
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
                label={
                  <FormattedMessage
                    id="xpack.ml.fileDatavisualizer.editFlyout.overrides.customDelimiterFormRowLabel"
                    defaultMessage="Custom delimiter"
                  />
                }
              >
                <EuiFieldText
                  value={customDelimiter}
                  onChange={this.onCustomDelimiterChange}
                />
              </EuiFormRow>
            }

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.editFlyout.overrides.quoteCharacterFormRowLabel"
                  defaultMessage="Quote character"
                />
              }
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
                label={
                  <FormattedMessage
                    id="xpack.ml.fileDatavisualizer.editFlyout.overrides.hasHeaderRowLabel"
                    defaultMessage="Has header row"
                  />
                }
                checked={hasHeaderRow}
                onChange={this.onHasHeaderRowChange}
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiCheckbox
                id={'shouldTrimFields'}
                label={
                  <FormattedMessage
                    id="xpack.ml.fileDatavisualizer.editFlyout.overrides.trimFieldsLabel"
                    defaultMessage="Should trim fields"
                  />
                }
                checked={shouldTrimFields}
                onChange={this.onShouldTrimFieldsChange}
              />
            </EuiFormRow>

          </React.Fragment>
        }
        {
          (format === 'semi_structured_text') &&
          <React.Fragment>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.editFlyout.overrides.grokPatternFormRowLabel"
                  defaultMessage="Grok pattern"
                />
              }
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
          label={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.editFlyout.overrides.timestampFormatFormRowLabel"
              defaultMessage="Timestamp format"
            />
          }
        >
          <EuiSuperSelect
            options={timestampFormatOptions}
            valueOfSelected={timestampFormat}
            onChange={this.onTimestampFormatChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.editFlyout.overrides.timeFieldFormRowLabel"
              defaultMessage="Time field"
            />
          }
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
          (format === 'delimited' && originalColumnNames.length > 0) &&

          <React.Fragment>
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.editFlyout.overrides.editFieldNamesTitle"
                  defaultMessage="Edit field names"
                />
              </h3>
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
function convertDelimiterBack(delimiter, customDelimiter) {
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

function isLinesToSampleValid(linesToSample) {
  return (linesToSample > LINES_TO_SAMPLE_VALUE_MIN && linesToSample <= LINES_TO_SAMPLE_VALUE_MAX);
}
