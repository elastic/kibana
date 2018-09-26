/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './styles/explorer_chart_label_badge.less';

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiBadge
} from '@elastic/eui';

export function ExplorerChartLabelBadge({ entity }) {
  return (
    <EuiBadge color="hollow" className="ml-explorer-chart-label-badge">
      {entity.fieldName} <strong>{entity.fieldValue}</strong>
    </EuiBadge>
  );
}
ExplorerChartLabelBadge.propTypes = {
  entity: PropTypes.shape({
    fieldName: PropTypes.string.isRequired,
    fieldValue: PropTypes.string.isRequired
  })
};
