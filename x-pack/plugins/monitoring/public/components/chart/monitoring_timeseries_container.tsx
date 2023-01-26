/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { get, first } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiScreenReaderOnly,
  EuiTextAlign,
  EuiButtonEmpty,
} from '@elastic/eui';
import { getTechnicalPreview } from './get_technical_preview';
import { getTitle } from './get_title';
import { getUnits } from './get_units';
import { MonitoringTimeseries } from './monitoring_timeseries';
import { InfoTooltip } from './info_tooltip';
import { AlertsBadge } from '../../alerts/badge';
import type { AlertsByName } from '../../alerts/types';

import './monitoring_timeseries_container.scss';

interface ZoomInfo {
  showZoomOutBtn: () => boolean;
  zoomOutHandler: () => void;
}

interface SeriesAlert {
  alerts: AlertsByName;
}
interface Series {
  metric: { title: string; label: string; description: string };
}
interface Props {
  series?: Series[] | SeriesAlert;
  onBrush?: ({ xaxis }: any) => void;
  zoomInfo?: ZoomInfo;
}

const isSeriesAlert = (series: SeriesAlert | Series[]): series is SeriesAlert => {
  return (series as SeriesAlert).alerts !== undefined;
};

const zoomOutBtn = (zoomInfo?: ZoomInfo) => {
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

const technicalPreviewBadge = (technicalPreview: boolean) => {
  if (!technicalPreview) {
    return null;
  }

  return (
    <EuiFlexItem>
      <EuiBadge color="hollow" iconType="cheer">
        <FormattedMessage
          id="xpack.monitoring.chart.timeSeries.technicalPreview"
          defaultMessage="Technical Preview"
        />
      </EuiBadge>
    </EuiFlexItem>
  );
};

export function MonitoringTimeseriesContainer({ series, onBrush, zoomInfo }: Props) {
  if (series === undefined) {
    return null; // still loading
  }

  const seriesMetrics = !isSeriesAlert(series) ? series : [];
  const title = getTitle(seriesMetrics);
  const technicalPreview = getTechnicalPreview(seriesMetrics);
  const titleForAriaIds = title.replace(/\s+/, '--');
  const units = getUnits(seriesMetrics);
  const bucketSize = get(first(seriesMetrics), 'bucket_size'); // bucket size will be the same for all metrics in all series

  const seriesScreenReaderTextList = [
    i18n.translate('xpack.monitoring.chart.seriesScreenReaderListDescription', {
      defaultMessage: 'Interval: {bucketSize}',
      values: {
        bucketSize,
      },
    }),
  ].concat(seriesMetrics.map((item) => `${item.metric.label}: ${item.metric.description}`));

  let alertStatus = null;
  const seriesAlert = isSeriesAlert(series) ? series : undefined;
  if (seriesAlert?.alerts) {
    alertStatus = (
      <EuiFlexItem grow={false}>
        <AlertsBadge alerts={seriesAlert.alerts} />
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
                <EuiTitle size="s">
                  <h2>
                    {getTitle(seriesMetrics)}
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
                    content={<InfoTooltip series={seriesMetrics} bucketSize={bucketSize} />}
                  />
                  <EuiScreenReaderOnly>
                    <span id={`monitoringChart${titleForAriaIds}`}>
                      {seriesScreenReaderTextList.join('. ')}
                    </span>
                  </EuiScreenReaderOnly>
                </Fragment>
              </EuiFlexItem>
              {technicalPreviewBadge(technicalPreview)}
              {zoomOutBtn(zoomInfo)}
            </EuiFlexGroup>
          </EuiFlexItem>
          {alertStatus}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: '200px' }}>
        <MonitoringTimeseries series={seriesMetrics} onBrush={onBrush} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
