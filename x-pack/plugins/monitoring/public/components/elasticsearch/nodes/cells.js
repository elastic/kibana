/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import { EuiStat, EuiText, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

function OfflineCell() {
  return (
    <div className="monTableCell__number monTableCell__offline">
      N/A
    </div>
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

function MetricCell({ isOnline, metric = {}, isPercent, ...props }) {
  if (isOnline) {
    const { lastVal, maxVal, minVal, slope } = get(metric, 'summary', {});
    const format = get(metric, 'metric.format');

    return (
      <EuiStat
        description=""
        title={(
          <EuiFlexGroup alignItems="center" {...props}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h4>
                  { metricVal(lastVal, format, isPercent) }
                  &nbsp;
                  <span className={`fa fa-long-arrow-${getSlopeArrow(slope)}`} />
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                { metricVal(maxVal, format, isPercent) + ' max' }
              </EuiText>
              <EuiText size="xs">
                { metricVal(minVal, format, isPercent) + ' min' }
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      />
    );
  }

  return <OfflineCell/>;
}

export {
  OfflineCell,
  MetricCell
};
