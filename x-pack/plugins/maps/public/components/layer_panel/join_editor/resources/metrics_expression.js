/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormErrorText,
} from '@elastic/eui';

import { MetricsEditor } from '../../../../shared/components/metrics_editor';

export class MetricsExpression extends Component {

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

  _renderMetricsEditor = () => {
    if (!this.props.rightFields) {
      return (
        <EuiFormErrorText>JOIN must be set</EuiFormErrorText>
      );
    }

    return (
      <MetricsEditor
        fields={this.props.rightFields}
        metrics={this.props.metrics}
        onChange={this.props.onChange}
      />
    );
  }

  render() {
    const metricExpressions = this.props.metrics
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
          return 'count';
        }

        return `${type} ${field}`;
      });

    return (
      <EuiPopover
        id="metricsPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        withTitle
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description={metricExpressions.length > 1 ? 'and use metrics' : 'and use metric'}
            uppercase={false}
            value={metricExpressions.length > 0 ? metricExpressions.join(', ') : 'count'}
          />
        }
      >
        <div style={{ width: 400 }}>
          <EuiPopoverTitle>Metrics</EuiPopoverTitle>
          {this._renderMetricsEditor()}
        </div>
      </EuiPopover>
    );
  }
}

MetricsExpression.propTypes = {
  metrics: PropTypes.array,
  rightFields: PropTypes.object,  // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
};

MetricsExpression.defaultProps = {
  metrics: [
    { type: 'count' }
  ]
};
