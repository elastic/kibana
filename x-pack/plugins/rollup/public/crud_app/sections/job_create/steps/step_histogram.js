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
  FieldList,
} from '../../components';

import {
  FieldChooser,
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

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.description"
                  defaultMessage={`
                    Select the fields you want to bucket using numeric histogram intervals.
                  `}
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="rollupJobWizardStepActions">
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={histogramDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepHistogram.readDocsButton.label"
                defaultMessage="Histogram docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={columns}
          fields={histogram}
          onRemoveField={this.onRemoveField}
          emptyMessage={<p>No histogram fields added</p>}
          addButton={(
            <FieldChooser
              buttonLabel={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.fieldsChooser.label"
                  defaultMessage="Add histogram fields"
                />
              )}
              columns={columns}
              fields={unselectedHistogramFields}
              onSelectField={this.onSelectField}
            />
          )}
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
        <EuiSpacer size="xl" />

        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.sectionHistogramInterval.title"
                  defaultMessage="Histogram interval"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepHistogram.sectionHistogramInterval.description"
              defaultMessage={`
                This is the interval of histogram buckets to be generated when rolling up, e.g. 5
                will create buckets that are five units wide (0-5, 5-10, etc). Note that only one
                interval can be specified in the histogram group, meaning that all fields being
                grouped via the histogram must share the same interval.
              `}
            />
          )}
          fullWidth
        >
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepHistogram.fieldHistogramInterval.label"
                defaultMessage="Interval"
              />
            )}
            error={errorHistogramInterval}
            isInvalid={Boolean(areStepErrorsVisible && errorHistogramInterval)}
            fullWidth
          >
            <EuiFieldNumber
              value={(!histogramInterval && histogramInterval !== 0) ? '' : Number(histogramInterval)}
              onChange={e => onFieldsChange({ histogramInterval: e.target.value })}
              isInvalid={Boolean(areStepErrorsVisible && errorHistogramInterval)}
              fullWidth
              min="0"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
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
