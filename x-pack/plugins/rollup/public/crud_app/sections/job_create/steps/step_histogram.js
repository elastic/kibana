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
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  histogramDetailsUrl,
} from '../../../services';

import {
  FieldChooser,
  FieldList,
} from './components';

export class StepHistogramUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    histogramFields: PropTypes.array.isRequired,
  }

  onSelectField = (field) => {
    const {
      fields: { histogram },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ histogram: histogram.concat(field) });
  };

  onRemoveField = (field) => {
    const {
      fields: { histogram },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ histogram: histogram.filter(histogramField => histogramField !== field) });
  };

  render() {
    const {
      fields,
      histogramFields,
    } = this.props;

    const {
      histogram,
    } = fields;

    const columns = [{
      field: 'name',
      name: 'Field',
      truncateText: true,
      sortable: true,
    }];

    const unselectedHistogramFields = histogramFields.filter(histogramField => {
      return !fields.histogram.includes(histogramField);
    });

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.title"
                  defaultMessage="Histogram (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.description"
                  defaultMessage={`
                    Select the fields you want to bucket using numeric histgogram intervals.
                  `}
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={histogramDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepHistogram.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <FieldList
          columns={columns}
          fields={histogram}
          onRemoveField={this.onRemoveField}
        />

        <EuiSpacer />

        <FieldChooser
          columns={columns}
          label={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepHistogram.fieldsChooser.label"
              defaultMessage="Select histogram fields"
            />
          )}
          fields={unselectedHistogramFields}
          onSelectField={this.onSelectField}
        />

        {this.renderInterval()}

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderInterval() {
    const {
      fields,
      onFieldsChange,
      areStepErrorsVisible,
      fieldErrors,
    } = this.props;

    const {
      histogram,
      histogramInterval,
    } = fields;

    const {
      histogramInterval: errorHistogramInterval,
    } = fieldErrors;

    if (!histogram.length) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h4>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepHistogram.sectionHistogramInterval.title"
              defaultMessage="Histogram interval"
            />
          </h4>
        </EuiTitle>

        <EuiText>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepHistogram.sectionHistogramInterval.description"
            defaultMessage={`
              This is the interval of histogram buckets to be generated when rolling up, e.g. 5
              will create buckets that are five units wide (0-5, 5-10, etc). Note that only one
              interval can be specified in the histogram group, meaning that all fields being
              grouped via the histogram must share the same interval.
            `}
          />
        </EuiText>

        <EuiSpacer />

        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepHistogram.fieldHistogramInterval.label"
              defaultMessage="Interval"
            />
          )}
          error={errorHistogramInterval}
          isInvalid={Boolean(areStepErrorsVisible && errorHistogramInterval)}
        >
          <EuiFieldNumber
            value={(!histogramInterval && histogramInterval !== 0) ? '' : Number(histogramInterval)}
            onChange={e => onFieldsChange({ histogramInterval: e.target.value })}
            isInvalid={Boolean(areStepErrorsVisible && errorHistogramInterval)}
          />
        </EuiFormRow>
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
              id="xpack.rollupJobs.create.stepGroups.stepError.title"
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

export const StepHistogram = injectI18n(StepHistogramUi);
