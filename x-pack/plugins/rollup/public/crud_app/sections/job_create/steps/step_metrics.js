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
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  metricsDetailsUrl,
} from '../../../services';

import {
  FieldList,
} from '../../components';

import {
  FieldChooser,
  StepError,
} from './components';

const whiteListedMetricByFieldType = {
  numeric: {
    avg: true,
    max: true,
    min: true,
    sum: true,
    value_count: true,
  },

  date: {
    max: true,
    min: true,
    value_count: true,
  },
};

export class StepMetricsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
    metricsFields: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.chooserColumns = [{
      field: 'name',
      name: 'Field',
      sortable: true,
      width: '240px',
    }, {
      field: 'type',
      name: 'Type',
      truncateText: true,
      sortable: true,
      width: '100px',
    }];

    const metricTypesConfig = [
      {
        type: 'avg',
        label: (
          <FormattedMessage
            id="xpack.rollupJobs.create.stepMetrics.checkboxAverageLabel"
            defaultMessage="Average"
          />
        ),
      }, {
        type: 'max',
        label: (
          <FormattedMessage
            id="xpack.rollupJobs.create.stepMetrics.checkboxMaxLabel"
            defaultMessage="Maximum"
          />
        ),
      }, {
        type: 'min',
        label: (
          <FormattedMessage
            id="xpack.rollupJobs.create.stepMetrics.checkboxMinLabel"
            defaultMessage="Minimum"
          />
        ),
      }, {
        type: 'sum',
        label: (
          <FormattedMessage
            id="xpack.rollupJobs.create.stepMetrics.checkboxSumLabel"
            defaultMessage="Sum"
          />
        ),
      }, {
        type: 'value_count',
        label: (
          <FormattedMessage
            id="xpack.rollupJobs.create.stepMetrics.checkboxValueCountLabel"
            defaultMessage="Value count"
          />
        ),
      },
    ];

    this.listColumns = this.chooserColumns.concat({
      type: 'metrics',
      name: 'Metrics',
      render: ({ name: fieldName, type: fieldType, types }) => {
        const checkboxes = metricTypesConfig.map(({ type, label }) => {
          const isAllowed = whiteListedMetricByFieldType[fieldType][type];

          if (!isAllowed) {
            return;
          }

          const isSelected = types.includes(type);

          return (
            <EuiFlexItem
              grow={false}
              key={`${fieldName}-${type}-checkbox`}
            >
              <EuiCheckbox
                id={`${fieldName}-${type}-checkbox`}
                label={label}
                checked={isSelected}
                onChange={() => this.setMetric(fieldName, type, !isSelected)}
              />
            </EuiFlexItem>
          );
        }).filter(checkbox => checkbox !== undefined);

        return (
          <EuiFlexGroup wrap gutterSize="m">
            {checkboxes}
          </EuiFlexGroup>
        );
      },
    });
  }

  onSelectField = (field) => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.concat({
      ...field,
      types: [],
    });

    onFieldsChange({ metrics: newMetrics });
  };

  onRemoveField = (field) => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.filter(({ name }) => name !== field.name);

    onFieldsChange({ metrics: newMetrics });
  };

  setMetric = (fieldName, metricType, isSelected) => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = [ ...metrics ];
    const { types: updatedTypes } = newMetrics.find(({ name }) => name === fieldName);

    if (isSelected) {
      updatedTypes.push(metricType);
    } else {
      updatedTypes.splice(updatedTypes.indexOf(metricType), 1);
    }

    onFieldsChange({ metrics: newMetrics });
  };

  render() {
    const {
      fields,
      metricsFields,
    } = this.props;

    const {
      metrics,
    } = fields;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetricsTitle"
                  defaultMessage="Metrics (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetricsDescription"
                  defaultMessage="Select the metrics to collect while rolling up data. By default,
                    only doc_counts are collected for each group."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="rollupJobWizardStepActions">
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={metricsDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepMetrics.readDocsButtonLabel"
                defaultMessage="Metrics docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={this.listColumns}
          fields={metrics}
          onRemoveField={this.onRemoveField}
          emptyMessage={<p>No metrics fields added</p>}
          addButton={(
            <FieldChooser
              buttonLabel={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetrics.fieldsChooserLabel"
                  defaultMessage="Add metrics fields"
                />
              )}
              columns={this.chooserColumns}
              fields={metricsFields}
              selectedFields={metrics}
              onSelectField={this.onSelectField}
            />
          )}
        />

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderErrors = () => {
    const { areStepErrorsVisible, fieldErrors } = this.props;
    const { metrics: errorMetrics } = fieldErrors;

    // Hide the error if there are no errors, which can occur if the errors are visible
    // but the user then addresses all of them.
    if (!areStepErrorsVisible || !errorMetrics) {
      return null;
    }

    return <StepError title={errorMetrics} />;
  }
}

export const StepMetrics = injectI18n(StepMetricsUi);
