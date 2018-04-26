/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import { KuiTableRowCell } from '@kbn/ui-framework/components';

function OfflineCell() {
  return (
    <KuiTableRowCell>
      <div className="monitoringTableCell__number monitoringTableCell__offline">
        N/A
      </div>
    </KuiTableRowCell>
  );
}

const getSlopeArrow = (slope) => {
  if (slope || slope === 0) {
    return slope > 0 ? 'up' : 'down';
  }
  return null;
};

const metricVal = (metric, format, isPercent) => {
  if (isPercent) {
    return formatMetric(metric, format, '%', { prependSpace: false });
  }
  return formatMetric(metric, format);
};

function MetricCell({ isOnline, metric = {}, isPercent }) {
  if (isOnline) {
    const { lastVal, maxVal, minVal, slope } = get(metric, 'summary', {});
    const format = get(metric, 'metric.format');

    return (
      <KuiTableRowCell>
        <div className="monitoringTableCell__MetricCell__metric">
          { metricVal(lastVal, format, isPercent) }
        </div>
        <span className={`monitoringTableCell__MetricCell__slopeArrow fa fa-long-arrow-${getSlopeArrow(slope)}`} />
        <div className="monitoringTableCell__MetricCell__minMax">
          <div>
            { metricVal(maxVal, format, isPercent) + ' max' }
          </div>
          <div>
            { metricVal(minVal, format, isPercent) + ' min' }
          </div>
        </div>
      </KuiTableRowCell>
    );
  }

  return <OfflineCell/>;
}

export {
  OfflineCell,
  MetricCell
};
