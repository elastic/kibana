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
import './monitoring_timeseries_container.scss';

import {
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiScreenReaderOnly,
  EuiTextAlign,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertsBadge } from '../../alerts/badge';

const zoomOutBtn = (zoomInfo) => {
  if (!zoomInfo || !zoomInfo.showZoomOutBtn()) {
    return null;
  }

  return (
    <EuiFlexItem className="monRhythmChart__zoom">
      <EuiTextAlign textAlign="right">
        <EuiButtonEmpty
          color="primary"
          size="s"
          iconType="magnifyWithMinus"
          onClick={zoomInfo.zoomOutHandler}
        >
          <FormattedMessage
            id="xpack.monitoring.chart.timeSeries.zoomOut"
            defaultMessage="Zoom out"
          />
        </EuiButtonEmpty>
      </EuiTextAlign>
    </EuiFlexItem>
  );
};

export function MonitoringTimeseriesContainer({ series, onBrush, zoomInfo }) {
  if (series === undefined) {
    return null; // still loading
  }

  const title = getTitle(series);
  const titleForAriaIds = title.replace(/\s+/, '--');
  const units = getUnits(series);
  const bucketSize = get(first(series), 'bucket_size'); // bucket size will be the same for all metrics in all series

  const seriesScreenReaderTextList = [
    i18n.translate('xpack.monitoring.chart.seriesScreenReaderListDescription', {
      defaultMessage: 'Interval: {bucketSize}',
      values: {
        bucketSize,
      },
    }),
  ].concat(series.map((item) => `${item.metric.label}: ${item.metric.description}`));

  let alertStatus = null;
  if (series.alerts) {
    alertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={series.alerts} />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" className={`monRhythmChart__wrapper`}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s" tabIndex="0">
                  <h2>
                    {getTitle(series)}
                    {units ? ` (${units})` : ''}
                    <EuiScreenReaderOnly>
                      <span>
                        <FormattedMessage
                          id="xpack.monitoring.chart.screenReaderUnaccessibleTitle"
                          defaultMessage="This chart is not screen reader accessible"
                        />
                      </span>
                    </EuiScreenReaderOnly>
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <Fragment>
                  <EuiIconTip
                    anchorClassName="eui-textRight eui-alignMiddle monChart__tooltipTrigger"
                    type="iInCircle"
                    position="right"
                    content={<InfoTooltip series={series} bucketSize={bucketSize} />}
                  />
                  <EuiScreenReaderOnly>
                    <span id={`monitoringChart${titleForAriaIds}`}>
                      {seriesScreenReaderTextList.join('. ')}
                    </span>
                  </EuiScreenReaderOnly>
                </Fragment>
              </EuiFlexItem>
              {zoomOutBtn(zoomInfo)}
            </EuiFlexGroup>
          </EuiFlexItem>
          {alertStatus}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: '200px' }}>
        <MonitoringTimeseries series={series} onBrush={onBrush} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
