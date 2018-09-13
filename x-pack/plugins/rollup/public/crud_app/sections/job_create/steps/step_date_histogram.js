/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  dateHistogramDetailsUrl,
  dateHistogramAggregationUrl,
} from '../../../services';

export class StepDateHistogramUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
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

  render() {
    const {
      fields,
      onFieldsChange,
      areStepErrorsVisible,
      fieldErrors,
    } = this.props;

    const {
      dateHistogramInterval,
      dateHistogramDelay,
      dateHistogramTimeZone,
      dateHistogramField,
    } = fields;

    const {
      dateHistogramInterval: errorDateHistogramInterval,
      dateHistogramDelay: errorDateHistogramDelay,
      dateHistogramTimeZone: errorDateHistogramTimeZone,
      dateHistogramField: errorDateHistogramField,
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
                  id="xpack.rollupJobs.create.stepDateHistogram.title"
                  defaultMessage="Date histogram"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.description"
                  defaultMessage="Define how {link} will operate on your rollup data."
                  values={{
                    link: (
                      <EuiLink href={dateHistogramAggregationUrl} target="_blank">
                        <FormattedMessage
                          id="xpack.rollupJobs.create.stepDateHistogram.descriptio"
                          defaultMessage="date histogram aggregations"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
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
                id="xpack.rollupJobs.create.stepDateHistogram.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogram.sectionDataSource.title"
                    defaultMessage="Data source"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepDateHistogram.sectionDataSource.description"
                defaultMessage={`
                  Which field contains the date histogram data and how large should its time buckets be?
                  Note that smaller, more granular intervals take up proportionally more space.
                `}
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldDateField.label"
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
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.label"
                  defaultMessage="Interval"
                />
              )}
              error={errorDateHistogramInterval}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
              helpText={(
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.stepDateHistogram.fieldInterval.helpExample.label"
                      defaultMessage="Example intervals: 30s, 20m, 5h, 1d, 1M."
                    />
                  </p>
                </Fragment>
              )}
              fullWidth
            >
              <EuiFieldText
                value={dateHistogramInterval || ''}
                onChange={e => onFieldsChange({ dateHistogramInterval: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramInterval)}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepDateHistogram.sectionDataStorage.title"
                    defaultMessage="Data storage"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepDateHistogram.sectionDataStorage.description"
                defaultMessage={`
                  How long should we wait before rolling up new documents? By default, the indexer
                  attempts to roll up all data that is available. You can also customize the time
                  zone stored with the rolled-up documents.
                `}
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldDelay.label"
                  defaultMessage="Delay (optional)"
                />
              )}
              error={errorDateHistogramDelay}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramDelay)}
              helpText={(
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.stepDateHistogram.fieldDelay.helpExample.label"
                      defaultMessage="Example delay values: 30s, 20m, 1h, 2d, 5M."
                    />
                  </p>
                </Fragment>
              )}
              fullWidth
            >
              <EuiFieldText
                value={dateHistogramDelay || ''}
                onChange={e => onFieldsChange({ dateHistogramDelay: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramDelay)}
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldTimeZone.label"
                  defaultMessage="Time zone (optional)"
                />
              )}
              error={errorDateHistogramTimeZone || ''}
              isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramTimeZone)}
              helpText={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldTimeZone.helpDefault.label"
                  defaultMessage="Defaults to {timeZone}."
                  values={{
                    timeZone: (
                      <EuiCode>
                        <FormattedMessage
                          id="xpack.rollupJobs.create.stepDateHistogram.fieldTimeZone.helpDefault.timeZone.label"
                          defaultMessage="UTC"
                        />
                      </EuiCode>
                    ),
                  }}
                />
              )}
              fullWidth
            >
              <EuiFieldText
                value={dateHistogramTimeZone || ''}
                onChange={e => onFieldsChange({ dateHistogramTimeZone: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorDateHistogramTimeZone)}
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
    const { areStepErrorsVisible } = this.props;

    if (!areStepErrorsVisible) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepDateHistogram.stepError.title"
              defaultMessage="Fix errors before going to next step"
            />
          )}
          color="danger"
          iconType="cross"
        />
      </Fragment>
    );
  }
}

export const StepDateHistogram = injectI18n(StepDateHistogramUi);
