/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import '@elastic/charts/dist/style.css';
import {
  Axis,
  CustomSeriesColorsMap,
  DARK_THEME,
  DataSeriesColorsValues,
  getAxisId,
  getSpecId,
  Chart,
  LIGHT_THEME,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { debounce } from 'lodash';
import { TimeBuckets } from 'ui/time_buckets';
import dateMath from '@elastic/datemath';
import chrome from 'ui/chrome';
import moment from 'moment-timezone';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { VisualizeOptions } from 'plugins/watcher/models/visualize_options';
import { getWatchVisualizationData } from '../../../lib/api';
import { WatchContext } from './watch_context';
import { aggTypes } from '../../../models/watch/agg_types';
const getChartTheme = () => {
  const isDarkTheme = chrome.getUiSettingsClient().get('theme:darkMode');
  const baseTheme = isDarkTheme ? DARK_THEME : LIGHT_THEME;

  return {
    ...baseTheme,
    lineSeriesStyle: {
      ...baseTheme.lineSeriesStyle,
      line: {
        ...baseTheme.lineSeriesStyle.line,
        strokeWidth: 3,
      },
      point: {
        ...baseTheme.lineSeriesStyle.point,
        visible: false,
      },
    },
  };
};
const getTimezone = () => {
  const config = chrome.getUiSettingsClient();
  const DATE_FORMAT_CONFIG_KEY = 'dateFormat:tz';
  const isCustomTimezone = !config.isDefault(DATE_FORMAT_CONFIG_KEY);
  if (isCustomTimezone) {
    return config.get(DATE_FORMAT_CONFIG_KEY);
  }

  const detectedTimezone = moment.tz.guess();
  if (detectedTimezone) {
    return detectedTimezone;
  }
  // default to UTC if we can't figure out the timezone
  const tzOffset = moment().format('Z');
  return tzOffset;
};

const getDomain = (watch: any) => {
  const VISUALIZE_TIME_WINDOW_MULTIPLIER = 5;
  const fromExpression = `now-${watch.timeWindowSize * VISUALIZE_TIME_WINDOW_MULTIPLIER}${
    watch.timeWindowUnit
    }`;
  const toExpression = 'now';
  const fromMoment = dateMath.parse(fromExpression);
  const toMoment = dateMath.parse(toExpression);
  const visualizeTimeWindowFrom = fromMoment ? fromMoment.valueOf() : 0;
  const visualizeTimeWindowTo = toMoment ? toMoment.valueOf() : 0;
  return {
    min: visualizeTimeWindowFrom,
    max: visualizeTimeWindowTo,
  };
};

const getTimeBuckets = (watch: any) => {
  const domain = getDomain(watch);
  const timeBuckets = new TimeBuckets();
  timeBuckets.setBounds(domain);
  return timeBuckets;
};

const loadWatchVisualizationData = debounce(async (watch: any, setWatchVisualizationData: any) => {
  const domain = getDomain(watch);
  const timeBuckets = new TimeBuckets();
  timeBuckets.setBounds(domain);
  const interval = timeBuckets.getInterval().expression;
  const visualizeOptions = new VisualizeOptions({
    rangeFrom: domain.min,
    rangeTo: domain.max,
    interval,
    timezone: getTimezone(),
  });
  const { visualizeData } = (await getWatchVisualizationData(watch, visualizeOptions)) as any;
  setWatchVisualizationData(visualizeData || {});
}, 500);

const WatchVisualizationUi = () => {
  const { watch } = useContext(WatchContext);
  const [watchVisualizationData, setWatchVisualizationData] = useState<any>({});

  useEffect(
    () => {
      loadWatchVisualizationData(watch, setWatchVisualizationData);
    },
    [watch]
  );

  const timezone = getTimezone();
  const dateFormatter = (d: number) => {
    return moment(d)
      .tz(timezone)
      .format(getTimeBuckets(watch).getScaledDateFormat());
  };
  const aggLabel = aggTypes[watch.aggType].text;
  const thresholdCustomSeriesColors: CustomSeriesColorsMap = new Map();
  const thresholdDataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId('threshold'),
  };
  thresholdCustomSeriesColors.set(thresholdDataSeriesColorValues, '#BD271E');
  const domain = getDomain(watch);
  const watchVisualizationDataKeys = Object.keys(watchVisualizationData);
  return (
    <Fragment>
      <EuiSpacer size="m" />
      {watchVisualizationDataKeys.length ? (
        <Chart size={[800, 300]} renderer="canvas">
          <Settings
            theme={getChartTheme()}
            xDomain={domain}
            showLegend={!!watch.termField}
            legendPosition={Position.Bottom}
          />
          <Axis
            id={getAxisId('bottom')}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis id={getAxisId('left')} title={aggLabel} position={Position.Left} />
          {watchVisualizationDataKeys.map((key: string) => {
            return (
              <LineSeries
                key={key}
                id={getSpecId(key)}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                data={watchVisualizationData[key]}
                xAccessor={0}
                yAccessors={[1]}
                timeZone={timezone}
              />
            );
          })}
          {watch.threshold.map((value: any, i: number) => {
            return (
              <LineSeries
                key={`threshold${i}`}
                id={getSpecId(`threshold${i}`)}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                data={[[domain.min, watch.threshold[i]], [domain.max, watch.threshold[i]]]}
                xAccessor={0}
                yAccessors={[1]}
                timeZone={timezone}
                yScaleToDataExtent={true}
                customSeriesColors={thresholdCustomSeriesColors}
              />
            );
          })}
        </Chart>
      ) : (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.watcher.thresholdPreviewChart.noDataTitle"
                defaultMessage="No data"
              />
            }
            color="warning"
          >
            <FormattedMessage
              id="xpack.watcher.thresholdPreviewChart.dataDoesNotExistTextMessage"
              defaultMessage="Your index and condition did not return any data."
            />
          </EuiCallOut>
        )}
      <EuiSpacer size="m" />
    </Fragment>
  );
};
export const WatchVisualization = injectI18n(WatchVisualizationUi);
