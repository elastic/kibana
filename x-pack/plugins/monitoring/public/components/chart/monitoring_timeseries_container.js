/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { get, first } from 'lodash';
import { getTitle } from './get_title';
import { getUnits } from './get_units';
import { MonitoringTimeseries } from './monitoring_timeseries';
import { InfoTooltip } from './info_tooltip';

import {
  EuiIconTip, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiScreenReaderOnly
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function MonitoringTimeseriesContainerUI({ series, onBrush, intl }) {
  if (series === undefined) {
    return null; // still loading
  }

  const title = getTitle(series);
  const titleForAriaIds = title.replace(/\s+/, '--');
  const units = getUnits(series);
  const bucketSize = get(first(series), 'bucket_size'); // bucket size will be the same for all metrics in all series

  const seriesScreenReaderTextList = [
    intl.formatMessage({
      id: 'xpack.monitoring.chart.seriesScreenReaderListDescription',
      defaultMessage: 'Interval: {bucketSize}' }, {
      bucketSize
    })
  ]
    .concat(series.map(item => `${item.metric.label}: ${item.metric.description}`));

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" style={{ flexGrow: 0 }}>
          <EuiFlexItem>
            <EuiTitle tabIndex="0">
              <Fragment>
                <EuiScreenReaderOnly>
                  <span>
                    <FormattedMessage
                      id="xpack.monitoring.chart.screenReaderUnaccessibleTitle"
                      defaultMessage="This chart is not screen reader accessible"
                    />
                  </span>
                </EuiScreenReaderOnly>
                <h2>
                  { getTitle(series) }{ units ? ` (${units})` : '' }
                </h2>
              </Fragment>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Fragment>
              <EuiIconTip
                anchorClassName="eui-textRight eui-alignMiddle monChart__tooltipTrigger"
                type="iInCircle"
                position="right"
                content={<InfoTooltip series={series} bucketSize={bucketSize}/>}
              />
              <EuiScreenReaderOnly>
                <span id={`monitoringChart${titleForAriaIds}`}>
                  {seriesScreenReaderTextList.join('. ')}
                </span>
              </EuiScreenReaderOnly>
            </Fragment>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: '200px' }}>
        <MonitoringTimeseries
          series={series}
          onBrush={onBrush}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const MonitoringTimeseriesContainer = injectI18n(MonitoringTimeseriesContainerUI);

