/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './styles/explorer_chart_label_badge.less';

import PropTypes from 'prop-types';
import React from 'react';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';

export function ExplorerChartLabel({ detectorLabel, entityFields, wrapLabel }) {
  const labelSeparator = (wrapLabel === true) ? <br /> : ' - ';

  return (
    <span className="explorer-chart-label-fields">
      {(detectorLabel.length > 0 && entityFields.length > 0) && (
        <span>{detectorLabel} {labelSeparator} </span>
      )}
      {(detectorLabel.length > 0 && entityFields.length === 0) && (
        <span>{detectorLabel}</span>
      )}
      {entityFields.map((entity, j) => {
        return (
          <span key={j}><ExplorerChartLabelBadge entity={entity} /> </span>
        );
      })}
    </span>
  );
}
ExplorerChartLabel.propTypes = {
  series: PropTypes.shape({
    detectorLabel: PropTypes.string.isRequired,
    entityFields: PropTypes.array.isRequired
  })
};
