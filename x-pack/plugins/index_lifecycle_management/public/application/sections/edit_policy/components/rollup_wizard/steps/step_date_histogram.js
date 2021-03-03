/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment-timezone';

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { search } from '../../../../../../../../../../src/plugins/data/public';
const { parseEsInterval } = search.aggs;

import { StepError } from './components';

const timeZoneOptions = moment.tz.names().map((name) => ({
  value: name,
  text: name,
}));

export const i18nTexts = {
  timeIntervalField: {
    calendar: i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalType.calendarLabel',
      { defaultMessage: 'Calendar' }
    ),
    fixed: i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalType.fixedLabel',
      { defaultMessage: 'Fixed' }
    ),
  },
};

export class StepDateHistogram extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    hasErrors: PropTypes.bool.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {};
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
                    id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.preferFixedWarningDayLabel"
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
                    id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.preferFixedWarningHourLabel"
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
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.preferFixedWarningYearLabel"
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
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.preferFixedWarningMonthLabel"
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
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.preferFixedWarningWeekLabel"
                  defaultMessage="Consider using the d unit instead of w. This allows for more flexible queries."
                />
              </p>
            </EuiTextColor>
          );
          break;
      }
    } catch (error) {
      // Swallow error; the validation logic will handle it elsewhere.
    }

    return (
      <Fragment>
        {preferFixedWarning}

        <p>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldInterval.helpExampleLabel"
            defaultMessage="Example sizes: 1000ms, 30s, 20m, 24h, 2d, 1w, 1M, 1y"
          />
        </p>
      </Fragment>
    );
  }

  render() {
    const { fields, onFieldsChange, areStepErrorsVisible, fieldErrors } = this.props;

    const {
      dateHistogramInterval,
      dateHistogramField,
      dateHistogramTimeZone,
      dateHistogramIntervalType,
    } = fields;

    const {
      dateHistogramInterval: errorDateHistogramInterval,
      dateHistogramField: errorDateHistogramField,
      dateHistogramTimeZone: errorDateHistogramTimeZone,
    } = fieldErrors;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="rollupCreateDateHistogramTitle">
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogramTitle"
                  defaultMessage="Date histogram"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiDescribedFormGroup
            title={<div />}
            description={
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogramDescription"
                    defaultMessage="Define how date histogram aggregations will operate on your rollup data."
                  />
                </p>

                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.sectionDataSourceDescription"
                    defaultMessage="Note that smaller time buckets take up proportionally more space."
                  />
                </p>
              </Fragment>
            }
            fullWidth
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldDateFieldLabel"
                  defaultMessage="Date field"
                />
              }
              error={errorDateHistogramField}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramField)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramField)}
                value={dateHistogramField ?? ''}
                onChange={(e) => onFieldsChange({ dateHistogramField: e.target.value })}
                fullWidth
                data-test-subj="rollupCreateDateFieldSelect"
              />
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalLabel"
                  defaultMessage="Time bucket size"
                />
              }
              error={errorDateHistogramInterval}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
              helpText={this.renderIntervalHelpText()}
              fullWidth
            >
              <EuiFieldText
                value={dateHistogramInterval || ''}
                onChange={(e) => onFieldsChange({ dateHistogramInterval: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
                fullWidth
                data-test-subj="rollupInterval"
              />
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalTypeLabel"
                  defaultMessage="Time interval type"
                />
              }
              fullWidth
            >
              <EuiSuperSelect
                valueOfSelected={dateHistogramIntervalType}
                options={[
                  {
                    value: 'fixed',
                    inputDisplay: i18nTexts.timeIntervalField.fixed,
                    dropdownDisplay: (
                      <>
                        <EuiText size="s">{i18nTexts.timeIntervalField.fixed}</EuiText>
                        <EuiText size="s" color="subdued">
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalType.fixedLabel"
                            defaultMessage="Each time interval is the same size."
                          />
                        </EuiText>
                      </>
                    ),
                  },
                  {
                    value: 'calendar',
                    inputDisplay: i18nTexts.timeIntervalField.calendar,
                    dropdownDisplay: (
                      <>
                        <EuiText size="s">{i18nTexts.timeIntervalField.calendar}</EuiText>
                        <EuiText size="s" color="subdued">
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldIntervalType.calendarHelpText"
                            defaultMessage="Takes varying day, month and year lengths into account."
                          />
                        </EuiText>
                      </>
                    ),
                  },
                ]}
                onChange={(value) => onFieldsChange({ dateHistogramIntervalType: value })}
                fullWidth
                data-test-subj="rollupIntervalType"
              />
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepDateHistogram.fieldTimeZoneLabel"
                  defaultMessage="Time zone"
                />
              }
              error={errorDateHistogramTimeZone || ''}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramTimeZone)}
              fullWidth
            >
              <EuiSelect
                options={timeZoneOptions}
                value={dateHistogramTimeZone}
                onChange={(e) => onFieldsChange({ dateHistogramTimeZone: e.target.value })}
                fullWidth
                data-test-subj="rollupCreateTimeZoneSelect"
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
  };
}
