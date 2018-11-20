/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpressionButton,
  EuiFormErrorText,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';

import { SingleFieldSelect } from '../../../../shared/components/single_field_select';

// TODO put this in a more top level area.
const AGG_OPTIONS = [
  { label: 'Average', value: 'avg' },
  { label: 'Count', value: 'count' },
  { label: 'Max', value: 'max' },
  { label: 'Min', value: 'min' },
  { label: 'Sum', value: 'sum' },
];
const METRIC_AGGS = AGG_OPTIONS.map(({ value }) => { return value; });

export class SelectExpression extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _onMetricChange(metric, index) {
    this.props.onChange([
      ...this.props.metrics.slice(0, index),
      metric,
      ...this.props.metrics.slice(index + 1)
    ]);
  }

  _renderAggSelect = (index, type) => {
    const onAggChange = (selectedOptions) => {
      const metric = {
        ...this.props.metrics[index],
        type: _.get(selectedOptions, '0.value'),
      };
      this._onMetricChange(metric, index);
    };
    return (
      <EuiFormRow
        label="Aggregation"
      >
        <EuiComboBox
          placeholder="Select aggregation"
          singleSelection={true}
          isClearable={false}
          options={AGG_OPTIONS}
          selectedOptions={AGG_OPTIONS.filter(({ value }) => {
            return value === type;
          })}
          onChange={onAggChange}
        />
      </EuiFormRow>
    );
  }

  _renderFieldSelect = (index, type, field) => {
    if (type === 'count') {
      return;
    }

    const onFieldChange = (fieldName) => {
      const metric = {
        ...this.props.metrics[index],
        field: fieldName,
      };
      this._onMetricChange(metric, index);
    };

    const filterNumberFields = (field) => {
      return field.type === 'number';
    };

    return (
      <EuiFormRow
        label="Field"
      >
        <SingleFieldSelect
          placeholder="Select field"
          value={field}
          onChange={onFieldChange}
          filterField={filterNumberFields}
          fields={this.props.rightFields}
          isClearable={false}
        />
      </EuiFormRow>
    );
  }

  _renderMetrics = () => {
    if (!this.props.rightFields) {
      return (
        <EuiFormErrorText>JOIN must be set</EuiFormErrorText>
      );
    }

    return this.props.metrics.map(({ type,  field }, index) => {
      return (
        <Fragment key={index}>
          {this._renderAggSelect(index, type)}
          {this._renderFieldSelect(index, type, field)}
        </Fragment>
      );
    });
  }

  render() {
    const metrics = this.props.metrics
      .filter(({ type, field }) => {
        if (type === 'count') {
          return true;
        }

        if (field) {
          return true;
        }
        return false;
      })
      .map(({ type, field }) => {
        if (type === 'count') {
          return 'count(*)';
        }

        return `${type}(right.${field})`;
      });

    return (
      <EuiPopover
        id="selectPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        withTitle
        button={
          <EuiExpressionButton
            onClick={this._togglePopover}
            description="SELECT"
            buttonValue={metrics.length > 0 ? metrics.join(',') : 'count(*)'}
          />
        }
      >
        <div style={{ width: 300 }}>
          <EuiPopoverTitle>SELECT</EuiPopoverTitle>
          {this._renderMetrics()}
        </div>
      </EuiPopover>
    );
  }
}

SelectExpression.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.oneOf(METRIC_AGGS).isRequired,
    field: PropTypes.string,
  })),
  rightFields: PropTypes.object,  // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
};

SelectExpression.defaultProps = {
  metrics: [
    { type: 'count' }
  ]
};
