/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

export function ExplorerChartTooltip({
  jobId,
  aggregationInterval,
  chartFunction,
  entityFields = [],
}) {
  return (
    <div className="explorer-chart-info-tooltip">
      job ID: {jobId}<br />
      aggregation interval: {aggregationInterval}<br />
      chart function: {chartFunction}
      {entityFields.map((entityField, i) => {
        return (
          <span key={`${entityField.fieldName}_${entityField.fieldValue}_${i}`}>
            <br />{entityField.fieldName}: {entityField.fieldValue}
          </span>
        );
      })}
    </div>
  );
}
ExplorerChartTooltip.propTypes = {
  jobId: PropTypes.string.isRequired,
  aggregationInterval: PropTypes.string,
  chartFunction: PropTypes.string,
  entityFields: PropTypes.array
};
