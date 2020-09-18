/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem, EuiBadge, EuiText } from '@elastic/eui';
import classNames from 'classnames';
import './metric.scss';

export function Metric({ className, warning, value }) {
  const classes = classNames('monPipelineViewer__metric', className);

  let stylizedValue;
  if (warning) {
    stylizedValue = (
      <EuiBadge color="warning" className={className}>
        {value}
      </EuiBadge>
    );
  } else {
    stylizedValue = (
      <EuiText size="s" color="subdued" className={classes}>
        <span>{value}</span>
      </EuiText>
    );
  }
  return (
    <EuiFlexItem className="monPipelineViewer__metricFlexItem" grow={false}>
      {stylizedValue}
    </EuiFlexItem>
  );
}

Metric.propTypes = {
  className: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  warning: PropTypes.bool,
};
