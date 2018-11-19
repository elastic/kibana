/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment-timezone';

import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import {
  parseEsInterval,
} from 'ui/utils/parse_es_interval';

import {
  dateHistogramDetailsUrl,
  dateHistogramAggregationUrl,
} from '../../../services';

import { StepError } from './components';

const timeZoneOptions = moment.tz.names().map(name => ({
  value: name,
  text: name,
}));

export class StepDateHistogramUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    hasErrors: PropTypes.bool.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
    dateFields: PropTypes.array.isRequired,
  }

  static getDerivedStateFromProps(props) {
    const { dateFields } = props;

    const dateHistogramFieldOptions = dateFields.map(dateField => ({
      value: dateField,
      text: dateField,
    }));

    return { dateHistogramFieldOptions };
  }

  constructor(props) {
    super(props);

    this.state = {
      dateHistogramFieldOptions: [],
    };
  }

  renderIntervalHelpText() {
    const { fields } = this.props;
    const { dateHistogramInterval } = fields;

    let preferFixedWarning;

    try {
      const { value, unit } = parseEsInterval(dateHistogramInterval);

      if (value === 1) {
        switch (unit) {
          case 'd':
            preferFixedWarning = (
              <EuiTextColor color="warning">
                <p>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.preferFixedWarningDayLabel"
                    defaultMessage="Consider using 24h instead of 1d. This allows for more flexible queries."
                  />
                </p>
              </EuiTextColor>
            );
            break;

          case 'h':
            preferFixedWarning = (
              <EuiTextColor color="warning">
                <p>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.preferFixedWarningHourLabel"
                    defaultMessage="Consider using 60m instead of 1h. This allows for more flexible queries."
                  />
                </p>
              </EuiTextColor>
            );
            break;
        }
      }

      switch (unit) {
        case 'y':
          preferFixedWarning = (
            <EuiTextColor color="warning">
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.preferFixedWarningYearLabel"
                  defaultMessage="Consider using the d unit instead of y. This allows for more flexible queries."
                />
              </p>
            </EuiTextColor>
          );
          break;

        case 'M':
          preferFixedWarning = (
            <EuiTextColor color="warning">
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.preferFixedWarningMonthLabel"
                  defaultMessage="Consider using the d unit instead of M. This allows for more flexible queries."
                />
              </p>
            </EuiTextColor>
          );
          break;

        case 'w':
          preferFixedWarning = (
            <EuiTextColor color="warning">
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.preferFixedWarningWeekLabel"
                  defaultMessage="Consider using the d unit instead of w. This allows for more flexible queries."
                />
              </p>
            </EuiTextColor>
          );
          break;
      }
    } catch(error) {
      // Swallow error; the validation logic will handle it elsewhere.
    }

    return (
      <Fragment>
        {preferFixedWarning}

        <p>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.helpExampleLabel"
            defaultMessage="Example sizes: 1000ms, 30s, 20m, 24h, 2d, 1w, 1M, 1y"
          />
        </p>
      </Fragment>
    );
  }

  render() {
    const {
      fields,
      onFieldsChange,
      areStepErrorsVisible,
      fieldErrors,
    } = this.props;

    const {
      dateHistogramInterval,
      dateHistogramField,
      dateHistogramTimeZone,
    } = fields;

    const {
      dateHistogramInterval: errorDateHistogramInterval,
      dateHistogramField: errorDateHistogramField,
      dateHistogramTimeZone: errorDateHistogramTimeZone,
    } = fieldErrors;

    const {
      dateHistogramFieldOptions,
    } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogramTitle"
                  defaultMessage="Date histogram"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={dateHistogramDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepDateHistogram.readDocsButtonLabel"
                defaultMessage="Date histogram docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiDescribedFormGroup
            title={<div />}
            description={(
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogramDescription"
                    defaultMessage="Define how {link} will operate on your rollup data."
                    values={{
                      link: (
                        <EuiLink href={dateHistogramAggregationUrl} target="_blank">
                          <FormattedMessage
                            id="xpack.rollupJobs.create.stepDateHistogramDescription.aggregationsLinkLabel"
                            defaultMessage="date histogram aggregations"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>

                <p>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogram.sectionDataSourceDescription"
                    defaultMessage="Note that smaller time buckets take up proportionally more space."
                  />
                </p>
              </Fragment>
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldDateFieldLabel"
                  defaultMessage="Date field"
                />
              )}
              error={errorDateHistogramField}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramField)}
              fullWidth
            >
              <EuiSelect
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramField)}
                options={dateHistogramFieldOptions}
                value={dateHistogramField}
                onChange={e => onFieldsChange({ dateHistogramField: e.target.value })}
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldIntervalLabel"
                  defaultMessage="Time bucket size"
                />
              )}
              error={errorDateHistogramInterval}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
              helpText={this.renderIntervalHelpText()}
              fullWidth
            >
              <EuiFieldText
                value={dateHistogramInterval || ''}
                onChange={e => onFieldsChange({ dateHistogramInterval: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldTimeZoneLabel"
                  defaultMessage="Time zone"
                />
              )}
              error={errorDateHistogramTimeZone || ''}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramTimeZone)}
              fullWidth
            >
              <EuiSelect
                options={timeZoneOptions}
                value={dateHistogramTimeZone}
                onChange={e => onFieldsChange({ dateHistogramTimeZone: e.target.value })}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderErrors = () => {
    const { areStepErrorsVisible, hasErrors } = this.props;

    if (!areStepErrorsVisible || !hasErrors) {
      return null;
    }

    return <StepError />;
  }
}

export const StepDateHistogram = injectI18n(StepDateHistogramUi);
