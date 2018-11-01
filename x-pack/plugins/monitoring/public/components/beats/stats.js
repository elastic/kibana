/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function Stats({ stats }) {
  const types = stats.types.map(({ type, count }, index) => {
    return (
      <EuiFlexItem
        key={`type-${index}`}
        data-test-subj="typeCount"
        data-test-type-count={type + ':' + count}
        grow={false}
      >
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            {type ? type + ': ' : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <strong>{formatMetric(count, 'int_commas')}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  });

  return (
    <div className="monSummaryStatus" role="status" data-test-subj="beatsSummaryStatus">

      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.monitoring.beats.overview.totalBeatsLabel"
            defaultMessage="Total Beats:"
          />
          &nbsp;
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <strong data-test-subj="totalBeats">
            {formatMetric(get(stats, 'total'), 'int_commas')}
          </strong>
        </EuiFlexItem>

        {types}

        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.monitoring.beats.overview.totalEventsLabel"
            defaultMessage="Total Events:"
          />
          &nbsp;
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <strong data-test-subj="totalEvents">
            {formatMetric(get(stats, 'stats.totalEvents'), '0.[0]a')}
          </strong>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.monitoring.beats.overview.bytesSentLabel"
            defaultMessage="Bytes Sent:"
          />
          &nbsp;
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <strong data-test-subj="bytesSent">
            {formatMetric(get(stats, 'stats.bytesSent'), 'byte')}
          </strong>
        </EuiFlexItem>
      </EuiFlexGroup>

    </div>
  );
}
