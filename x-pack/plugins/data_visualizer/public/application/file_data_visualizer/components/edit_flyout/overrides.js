/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';

import {
  EuiComboBox,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTextArea,
} from '@elastic/eui';

import { FILE_FORMATS } from '../../../../../common/constants';

import {
  getFormatOptions,
  getTimestampFormatOptions,
  getDelimiterOptions,
  getQuoteOptions,
  // getCharsetOptions,
} from './options';
import { isTimestampFormatValid } from './overrides_validation';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { replaceFieldInGrokPattern } from '../../../common/util/grok_pattern';
import {
  convertDelimiter,
  convertDelimiterBack,
  getColumnNames,
  getGrokFieldNames,
  isLinesToSampleValid,
  LINES_TO_SAMPLE_VALUE_MIN,
  LINES_TO_SAMPLE_VALUE_MAX,
} from './overrides_utils';

import { TIMESTAMP_OPTIONS, CUSTOM_DROPDOWN_OPTION } from './options/option_lists';

const formatOptions = getFormatOptions();
const timestampFormatOptions = getTimestampFormatOptions();
const delimiterOptions = getDelimiterOptions();
const quoteOptions = getQuoteOptions();

class OverridesUI extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  linesToSampleErrors = i18n.translate(
    'xpack.dataVisualizer.file.editFlyout.overrides.linesToSampleErrorMessage',
    {
      defaultMessage: 'Value must be greater than {min} and less than or equal to {max}',
      values: {
        min: LINES_TO_SAMPLE_VALUE_MIN,
        max: LINES_TO_SAMPLE_VALUE_MAX,
      },
    }
  );

  customTimestampFormatErrors = i18n.translate(
    'xpack.dataVisualizer.file.editFlyout.overrides.customTimestampFormatErrorMessage',
    {
      defaultMessage: `Timestamp format must be a combination of these Java date/time formats:
      yy, yyyy, M, MM, MMM, MMMM, d, dd, EEE, EEEE, H, HH, h, mm, ss, S through SSSSSSSSS, a, XX, XXX, zzz`,
    }
  );

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

    const { delimiter: d, customDelimiter: customD } = convertDelimiter(
      delimiter === undefined ? originalSettings.delimiter : delimiter
    );

    const { newColumnNames, originalColumnNames } = getColumnNames(columnNames, originalSettings);

    const newGrokFieldNames = getGrokFieldNames(grokPattern, originalSettings.grokPattern);

    const overrides = {
      charset: charset === undefined ? originalSettings.charset : charset,
      format: format === undefined ? originalSettings.format : format,
      hasHeaderRow: hasHeaderRow === undefined ? originalSettings.hasHeaderRow : hasHeaderRow,
      columnNames: newColumnNames,
      grokFieldNames: newGrokFieldNames,
      delimiter: d,
      quote: quote === undefined ? originalSettings.quote : quote,
      shouldTrimFields:
        shouldTrimFields === undefined ? originalSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: grokPattern === undefined ? originalSettings.grokPattern : grokPattern,
      timestampFormat:
        timestampFormat === undefined ? originalSettings.timestampFormat : timestampFormat,
      timestampField:
        timestampField === undefined ? originalSettings.timestampField : timestampField,
      linesToSample: linesToSample === undefined ? originalSettings.linesToSample : +linesToSample,
    };

    return {
      originalColumnNames,
      originalGrokFieldNames: newGrokFieldNames,
      customDelimiter: customD === undefined ? '' : customD,
      customTimestampFormat: '',
      linesToSampleValid: true,
      timestampFormatValid: true,
      timestampFormatError: null,
      overrides,
      ...state,
    };
  }

  componentDidMount() {
    const originalTimestampFormat =
      this.props && this.props.originalSettings && this.props.originalSettings.timestampFormat;

    if (typeof this.props.setApplyOverrides === 'function') {
      this.props.setApplyOverrides(this.applyOverrides);
    }

    if (originalTimestampFormat !== undefined) {
      const optionExists = TIMESTAMP_OPTIONS.some((option) => option === originalTimestampFormat);
      if (optionExists === false) {
        // Incoming format does not exist in dropdown. Display custom input with incoming format as default value.
        const overrides = { ...this.state.overrides };
        overrides.timestampFormat = CUSTOM_DROPDOWN_OPTION;
        this.setState({ customTimestampFormat: originalTimestampFormat, overrides });
      }
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
    if (
      overrides.timestampFormat === CUSTOM_DROPDOWN_OPTION &&
      this.state.customTimestampFormat !== ''
    ) {
      overrides.timestampFormat = this.state.customTimestampFormat;
    }

    this.props.setOverrides(overrides);
  };

  setOverride(o) {
    const overrides = { ...this.state.overrides, ...o };
    this.setState({ overrides });
  }

  onFormatChange = ([opt]) => {
    const format = opt ? opt.label : '';
    this.setOverride({ format });
  };

  onTimestampFormatChange = ([opt]) => {
    const timestampFormat = opt ? opt.label : '';
    this.setOverride({ timestampFormat });
    if (opt !== CUSTOM_DROPDOWN_OPTION) {
      this.props.setOverridesValid(true);
    }
  };

  onCustomTimestampFormatChange = (e) => {
    this.setState({ customTimestampFormat: e.target.value });
    // check whether the value is valid and set that to state.
    const { isValid, errorMessage } = isTimestampFormatValid(e.target.value);
    this.setState({ timestampFormatValid: isValid, timestampFormatError: errorMessage });
    this.props.setOverridesValid(isValid);
  };

  onTimestampFieldChange = ([opt]) => {
    const timestampField = opt ? opt.label : '';
    this.setOverride({ timestampField });
  };

  onDelimiterChange = ([opt]) => {
    const delimiter = opt ? opt.label : '';
    this.setOverride({ delimiter });
  };

  onCustomDelimiterChange = (e) => {
    this.setState({ customDelimiter: e.target.value });
  };

  onQuoteChange = ([opt]) => {
    const quote = opt ? opt.label : '';
    this.setOverride({ quote });
  };

  onHasHeaderRowChange = (e) => {
    this.setOverride({ hasHeaderRow: e.target.checked });
  };

  onShouldTrimFieldsChange = (e) => {
    this.setOverride({ shouldTrimFields: e.target.checked });
  };

  onCharsetChange = ([opt]) => {
    const charset = opt ? opt.label : '';
    this.setOverride({ charset });
  };

  onColumnNameChange = (e, i) => {
    const columnNames = this.state.overrides.columnNames;
    columnNames[i] = e.target.value;
    this.setOverride({ columnNames });
  };

  onGrokPatternFieldChange = (e, i) => {
    const name = e.target.value;
    const newGrokPattern = replaceFieldInGrokPattern(this.state.overrides.grokPattern, name, i);
    const newGrokFieldNames = getGrokFieldNames(newGrokPattern, this.state.overrides.grokPattern);
    this.setOverride({ grokPattern: newGrokPattern, grokFieldNames: newGrokFieldNames });
  };

  grokPatternChange = (e) => {
    const newGrokPattern = e.target.value;
    const newGrokFieldNames = getGrokFieldNames(newGrokPattern, this.state.overrides.grokPattern);
    this.setOverride({ grokPattern: newGrokPattern, grokFieldNames: newGrokFieldNames });
  };

  onLinesToSampleChange = (e) => {
    const linesToSample = +e.target.value;
    this.setOverride({ linesToSample });

    // check whether the value is valid and set that to state.
    const linesToSampleValid = isLinesToSampleValid(linesToSample);
    this.setState({ linesToSampleValid });

    // set the overrides valid setting in the parent component,
    // used to disable the Apply button if any of the overrides are invalid
    this.props.setOverridesValid(linesToSampleValid);
  };

  render() {
    const { fields } = this.props;
    const {
      customDelimiter,
      customTimestampFormat,
      originalColumnNames,
      originalGrokFieldNames,
      linesToSampleValid,
      timestampFormatError,
      timestampFormatValid,
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
      grokFieldNames,
      grokPattern,
      linesToSample,
    } = overrides;

    const fieldOptions = getSortedFields(fields);
    const timestampFormatErrorsList = [this.customTimestampFormatErrors, timestampFormatError];
    const docsUrl = this.props.kibana.services.docLinks.links.aggs.date_format_pattern;

    const timestampFormatHelp = (
      <EuiText size="xs">
        <EuiLink href={docsUrl} target="_blank">
          {i18n.translate(
            'xpack.dataVisualizer.file.editFlyout.overrides.timestampFormatHelpText',
            {
              defaultMessage: 'See more on accepted formats',
            }
          )}
        </EuiLink>
      </EuiText>
    );

    return (
      <EuiForm>
        <EuiFormRow
          error={this.linesToSampleErrors}
          isInvalid={linesToSampleValid === false}
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.linesToSampleFormRowLabel"
              defaultMessage="Number of lines to sample"
            />
          }
        >
          <EuiFieldNumber
            value={linesToSample}
            onChange={this.onLinesToSampleChange}
            isInvalid={linesToSampleValid === false}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.dataFormatFormRowLabel"
              defaultMessage="Data format"
            />
          }
        >
          <EuiComboBox
            options={formatOptions}
            selectedOptions={selectedOption(format)}
            onChange={this.onFormatChange}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
          />
        </EuiFormRow>
        {format === FILE_FORMATS.DELIMITED && (
          <React.Fragment>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.delimiterFormRowLabel"
                  defaultMessage="Delimiter"
                />
              }
            >
              <EuiComboBox
                options={delimiterOptions}
                selectedOptions={selectedOption(delimiter)}
                onChange={this.onDelimiterChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
              />
            </EuiFormRow>
            {delimiter === CUSTOM_DROPDOWN_OPTION && (
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.customDelimiterFormRowLabel"
                    defaultMessage="Custom delimiter"
                  />
                }
              >
                <EuiFieldText value={customDelimiter} onChange={this.onCustomDelimiterChange} />
              </EuiFormRow>
            )}

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.quoteCharacterFormRowLabel"
                  defaultMessage="Quote character"
                />
              }
            >
              <EuiComboBox
                options={quoteOptions}
                selectedOptions={selectedOption(quote)}
                onChange={this.onQuoteChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiCheckbox
                id={'hasHeaderRow'}
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.hasHeaderRowLabel"
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
                    id="xpack.dataVisualizer.file.editFlyout.overrides.trimFieldsLabel"
                    defaultMessage="Should trim fields"
                  />
                }
                checked={shouldTrimFields}
                onChange={this.onShouldTrimFieldsChange}
              />
            </EuiFormRow>
          </React.Fragment>
        )}
        {format === FILE_FORMATS.SEMI_STRUCTURED_TEXT && (
          <React.Fragment>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.grokPatternFormRowLabel"
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
        )}
        <EuiFormRow
          helpText={timestampFormatHelp}
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.timestampFormatFormRowLabel"
              defaultMessage="Timestamp format"
            />
          }
        >
          <EuiComboBox
            options={timestampFormatOptions}
            selectedOptions={selectedOption(timestampFormat)}
            onChange={this.onTimestampFormatChange}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
          />
        </EuiFormRow>
        {timestampFormat === CUSTOM_DROPDOWN_OPTION && (
          <EuiFormRow
            error={timestampFormatErrorsList}
            isInvalid={timestampFormatValid === false}
            label={
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.overrides.customTimestampFormatFormRowLabel"
                defaultMessage="Custom timestamp format"
              />
            }
          >
            <EuiFieldText
              value={customTimestampFormat}
              onChange={this.onCustomTimestampFormatChange}
              isInvalid={timestampFormatValid === false}
            />
          </EuiFormRow>
        )}

        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.timeFieldFormRowLabel"
              defaultMessage="Time field"
            />
          }
        >
          <EuiComboBox
            options={fieldOptions}
            selectedOptions={selectedOption(timestampField)}
            onChange={this.onTimestampFieldChange}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
          />
        </EuiFormRow>

        {/* <EuiFormRow
          label="Charset"
        >
          <EuiComboBox
            options={charsetOptions}
            selectedOptions={selectedOption(charset)}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
          />
        </EuiFormRow> */}
        {format === FILE_FORMATS.DELIMITED && originalColumnNames.length > 0 && (
          <React.Fragment>
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.editFieldNamesTitle"
                  defaultMessage="Edit field names"
                />
              </h3>
            </EuiTitle>

            {originalColumnNames.map((f, i) => (
              <EuiFormRow label={f} key={f}>
                <EuiFieldText
                  value={columnNames[i]}
                  onChange={(e) => this.onColumnNameChange(e, i)}
                />
              </EuiFormRow>
            ))}
          </React.Fragment>
        )}

        {format === FILE_FORMATS.SEMI_STRUCTURED_TEXT && originalGrokFieldNames.length > 0 && (
          <React.Fragment>
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.editFieldNamesTitle"
                  defaultMessage="Edit field names"
                />
              </h3>
            </EuiTitle>

            {originalGrokFieldNames.map((f, i) => (
              <EuiFormRow label={f} key={f}>
                <EuiFieldText
                  value={grokFieldNames[i]}
                  onChange={(e) => this.onGrokPatternFieldChange(e, i, grokPattern)}
                />
              </EuiFormRow>
            ))}
          </React.Fragment>
        )}
      </EuiForm>
    );
  }
}

export const Overrides = withKibana(OverridesUI);

function selectedOption(opt) {
  return [{ label: opt || '' }];
}

// return a list of objects compatible with EuiComboBox
// also sort alphanumerically
function getSortedFields(fields) {
  return fields
    .map((f) => ({ label: f }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
