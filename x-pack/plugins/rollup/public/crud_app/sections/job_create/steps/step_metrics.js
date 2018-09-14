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
  FieldChooser,
  FieldList,
} from './components';

export class StepMetricsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    metricsFields: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.chooserColumns = [{
      field: 'name',
      name: 'Field',
      truncateText: true,
      sortable: true,
    }];

    const metricTypesConfig = [{
      type: 'min',
      name: '',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxMin.label"
          defaultMessage="Minimum"
        />
      ),
    }, {
      type: 'max',
      name: '',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxMax.label"
          defaultMessage="Maximum"
        />
      ),
    }, {
      type: 'sum',
      name: '',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxSum.label"
          defaultMessage="Sum"
        />
      ),
    }, {
      type: 'avg',
      name: '',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxAverage.label"
          defaultMessage="Average"
        />
      ),
    }, {
      type: 'value_count',
      name: '',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxValueCount.label"
          defaultMessage="Value count"
        />
      ),
    }];

    const metricTypeColumns = metricTypesConfig.map(({ type, name, label }) => ({
      name,
      render: ({ name: fieldName, types }) => {
        const isSelected = types.includes(type);

        return (
          <EuiCheckbox
            id={`${fieldName}-${type}-checkbox`}
            label={label}
            checked={isSelected}
            onChange={() => this.setMetric(fieldName, type, !isSelected)}
          />
        );
      },
    }));

    this.listColumns = this.chooserColumns.concat(metricTypeColumns);
  }

  onSelectField = (field) => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.concat({
      name: field.name,
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

    const unselectedMetricsFields = metricsFields.filter(metricField => {
      return !metrics.find(({ name }) => name === metricField.name);
    });

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetrics.title"
                  defaultMessage="Metrics (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetrics.description"
                  defaultMessage={`
                    Select the metrics that should be collected from rolled-up data. By default,
                    only the doc_counts are collected for each group.
                  `}
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={metricsDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepMetrics.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <FieldList
          columns={this.listColumns}
          fields={metrics}
          onRemoveField={this.onRemoveField}
        />

        <EuiSpacer />

        <FieldChooser
          buttonLabel={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepMetrics.fieldsChooser.label"
              defaultMessage="Select metrics fields"
            />
          )}
          columns={this.chooserColumns}
          fields={unselectedMetricsFields}
          onSelectField={this.onSelectField}
        />
      </Fragment>
    );
  }
}

export const StepMetrics = injectI18n(StepMetricsUi);
