/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem } from '@elastic/eui';

export function Metric({ className, value }) {
  return (
    <EuiFlexItem
      grow={false}
      className={"cv-pluginStatement__metricContainer"}
    >
      <div className={className}>
        {value}
      </div>
    </EuiFlexItem>
  );
}

Metric.propTypes = {
  className: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};
