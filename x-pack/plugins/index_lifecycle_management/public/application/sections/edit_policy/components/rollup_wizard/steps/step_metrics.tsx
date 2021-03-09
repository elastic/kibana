/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPopover,
  EuiButton,
  EuiBasicTableColumn,
} from '@elastic/eui';

// @ts-ignore
import { FieldList } from '../components';
import { StepFields } from '../rollup_wizard';

// @ts-ignore
import { FieldChooser, StepError } from './components';

export const METRICS_CONFIG = [
  {
    type: 'avg',
    label: i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.stepMetrics.checkboxAverageLabel',
      {
        defaultMessage: 'Average',
      }
    ),
  },
  {
    type: 'max',
    label: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.checkboxMaxLabel', {
      defaultMessage: 'Maximum',
    }),
  },
  {
    type: 'min',
    label: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.checkboxMinLabel', {
      defaultMessage: 'Minimum',
    }),
  },
  {
    type: 'sum',
    label: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.checkboxSumLabel', {
      defaultMessage: 'Sum',
    }),
  },
  {
    type: 'value_count',
    label: i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.stepMetrics.checkboxValueCountLabel',
      {
        defaultMessage: 'Value count',
      }
    ),
  },
];

interface State {
  metricsPopoverOpen: boolean;
  listColumns: string[];
  selectedMetricsMap: unknown[];
}

interface Props {
  fields: StepFields['STEP_METRICS'];
  indexPattern: string;
  onIndexPatternChange: (value: string) => void;
  onFieldsChange: (value: StepFields['STEP_METRICS']) => void;
  fieldErrors: Record<string, unknown>;
  areStepErrorsVisible: boolean;
}

export class StepMetrics extends Component<Props, State> {
  static propTypes = {};

  constructor(props: Props) {
    super(props);

    this.state = {
      metricsPopoverOpen: false,
      listColumns: [],
      selectedMetricsMap: [],
    };
  }

  openMetricsPopover = () => {
    this.setState({
      metricsPopoverOpen: true,
    });
  };

  closeMetricsPopover = () => {
    this.setState({
      metricsPopoverOpen: false,
    });
  };

  renderMetricsSelectAllCheckboxes() {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    let disabledCheckboxesCount = 0;

    /**
     * Look at all the metric configs and include the special "All" checkbox which adds the ability
     * to select all the checkboxes across columns and rows.
     */
    const checkboxElements = [
      {
        label: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.allCheckbox', {
          defaultMessage: 'All',
        }),
        type: 'all',
      },
    ]
      .concat(METRICS_CONFIG)
      .map(({ label, type: metricType }, idx) => {
        const isAllMetricTypes = metricType === 'all';

        let checkedCount = 0;
        let isChecked = false;
        const isDisabled = metrics.length === 0;

        if (isAllMetricTypes) {
          metrics.forEach(({ types }) => {
            if (METRICS_CONFIG.every(({ type }) => types.some((t) => t === type))) {
              ++checkedCount;
            }
          });
        } else {
          metrics.forEach(({ types }) => {
            const metricSelected = types.some((type) => type === metricType);
            if (metricSelected) {
              ++checkedCount;
            }
          });
        }

        // Determine if a select all checkbox is checked.
        isChecked = checkedCount === metrics.length;

        if (isDisabled) ++disabledCheckboxesCount;

        return (
          <EuiCheckbox
            id={`${idx}-select-all-checkbox`}
            data-test-subj={`rollupJobMetricsSelectAllCheckbox-${metricType}`}
            disabled={isDisabled}
            label={label}
            checked={!isDisabled && isChecked}
            onChange={() => {
              if (isAllMetricTypes) {
                let lastResult: StepFields['STEP_METRICS']['metrics'] = [];
                for (const metric of METRICS_CONFIG) {
                  lastResult = this.setMetrics(metric.type, !isChecked);
                }
                onFieldsChange({ metrics: lastResult });
              } else {
                onFieldsChange({ metrics: this.setMetrics(metricType, !isChecked) });
              }
            }}
          />
        );
      });

    return {
      checkboxElements,
      allCheckboxesDisabled: checkboxElements.length === disabledCheckboxesCount,
    };
  }

  getMetricsSelectAllMenu() {
    const { checkboxElements, allCheckboxesDisabled } = this.renderMetricsSelectAllCheckboxes();

    return (
      <Fragment>
        <EuiPopover
          ownFocus
          isOpen={this.state.metricsPopoverOpen}
          closePopover={this.closeMetricsPopover}
          button={
            <EuiButton
              disabled={allCheckboxesDisabled}
              onClick={this.openMetricsPopover}
              data-test-subj="rollupJobSelectAllMetricsPopoverButton"
            >
              {i18n.translate(
                'xpack.indexLifecycleMgmt.rollup.create.stepMetrics.selectAllPopoverButtonLabel',
                {
                  defaultMessage: 'Select metrics',
                }
              )}
            </EuiButton>
          }
        >
          <EuiFlexGroup alignItems="flexStart" direction="column">
            {checkboxElements.map((item, idx) => (
              <EuiFlexItem key={idx}>{item}</EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPopover>
      </Fragment>
    );
  }

  renderRowSelectAll({ fieldName, types }: { fieldName: string; types: string[] }) {
    const { onFieldsChange } = this.props;
    const hasSelectedItems = Boolean(types.length);
    const maxItemsToBeSelected = METRICS_CONFIG.length;
    const allSelected = maxItemsToBeSelected <= types.length;

    const label = i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.stepMetrics.selectAllRowLabel',
      {
        defaultMessage: 'All',
      }
    );

    const onChange = () => {
      const isSelected = hasSelectedItems ? types.length !== maxItemsToBeSelected : true;
      let lastResult: StepFields['STEP_METRICS']['metrics'] = [];
      for (const metric of METRICS_CONFIG) {
        lastResult = this.setMetric(fieldName, metric.type, isSelected);
      }
      onFieldsChange({ metrics: lastResult });
    };

    return (
      <EuiCheckbox
        id={`${fieldName}-selectAll-checkbox`}
        data-test-subj="rollupJobMetricsCheckbox-selectAll"
        label={label}
        checked={allSelected}
        onChange={onChange}
      />
    );
  }

  getListColumns() {
    return StepMetrics.chooserColumns.concat({
      name: i18n.translate(
        'xpack.indexLifecycleMgmt.rollup.create.stepMetrics.metricsColumnHeader',
        {
          defaultMessage: 'Metrics',
        }
      ),
      render: ({ name: fieldName, types }: { name: string; types: string[] }) => {
        const { onFieldsChange } = this.props;
        const checkboxes = METRICS_CONFIG.map(({ type, label }) => {
          const isSelected = types.includes(type);

          return (
            <EuiFlexItem grow={false} key={`${fieldName}-${type}-checkbox`}>
              <EuiCheckbox
                id={`${fieldName}-${type}-checkbox`}
                data-test-subj={`rollupJobMetricsCheckbox-${type}`}
                label={label}
                checked={isSelected}
                onChange={() =>
                  onFieldsChange({ metrics: this.setMetric(fieldName, type, !isSelected) })
                }
              />
            </EuiFlexItem>
          );
        }).filter((checkbox) => checkbox !== undefined);

        return (
          <EuiFlexGroup wrap gutterSize="m">
            <EuiFlexItem grow={false} key={`${fieldName}-selectAll-checkbox`}>
              {this.renderRowSelectAll({ fieldName, types })}
            </EuiFlexItem>
            {checkboxes}
          </EuiFlexGroup>
        );
      },
    });
  }

  onSelectField = (field: { name: string }) => {
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

  onRemoveField = (field: { name: string }) => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.filter(({ name }) => name !== field.name);

    onFieldsChange({ metrics: newMetrics });
  };

  setMetrics(metricType: string, isSelected: boolean) {
    const {
      fields: { metrics: fields },
    } = this.props;

    let lastResult: StepFields['STEP_METRICS']['metrics'] = [];

    for (const field of fields) {
      lastResult = this.setMetric(field.name, metricType, isSelected);
    }

    return lastResult;
  }

  setMetric = (fieldName: string, metricType: string, isSelected: boolean) => {
    const {
      fields: { metrics },
    } = this.props;

    const newMetrics = [...metrics];
    const newMetric = newMetrics.find(({ name }) => name === fieldName);

    if (!newMetric) {
      // Nothing found to update
      return newMetrics;
    }

    // Update copied object by reference
    if (isSelected) {
      // Don't add duplicates.
      if (newMetric.types.indexOf(metricType) === -1) {
        newMetric.types.push(metricType);
      }
    } else {
      newMetric.types.splice(newMetric.types.indexOf(metricType), 1);
    }
    return newMetrics;
  };

  render() {
    const { fields, indexPattern, onIndexPatternChange } = this.props;

    const { metrics } = fields;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="rollupJobCreateMetricsTitle">
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepMetricsTitle"
                  defaultMessage="Metrics"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepMetricsDescription"
                  defaultMessage="Select the metrics to collect while rolling up data. By default,
                    only doc_counts are collected for each group."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={this.getListColumns()}
          fields={metrics}
          onRemoveField={this.onRemoveField}
          emptyMessage={
            <p>
              {i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.emptyListLabel', {
                defaultMessage: 'No metrics fields added',
              })}
            </p>
          }
          addButton={
            <EuiFlexGroup justifyContent="spaceEvenly" alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <FieldChooser
                  key="stepMetricsFieldChooser"
                  indexPattern={indexPattern}
                  onIndexPatternChange={onIndexPatternChange}
                  buttonLabel={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.rollup.create.stepMetrics.fieldsChooserLabel"
                      defaultMessage="Add metrics fields"
                    />
                  }
                  columns={StepMetrics.chooserColumns}
                  selectedFields={metrics}
                  onSelectField={this.onSelectField}
                  dataTestSubj="rollupJobMetricsFieldChooser"
                />
              </EuiFlexItem>
              <EuiFlexItem>{this.getMetricsSelectAllMenu()}</EuiFlexItem>
            </EuiFlexGroup>
          }
          dataTestSubj="rollupJobMetricsFieldList"
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
  };

  static chooserColumns: Array<EuiBasicTableColumn<{ name: string; types: string[] }>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.stepMetrics.fieldColumnLabel', {
        defaultMessage: 'Field',
      }),
      sortable: true,
    },
  ];
}
