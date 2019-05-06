/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import '@elastic/charts/dist/style.css';
import {
  AnnotationDomainTypes,
  Axis,
  DARK_THEME,
  getAnnotationId,
  getAxisId,
  getSpecId,
  Chart,
  LIGHT_THEME,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { TimeBuckets } from 'ui/time_buckets';
import dateMath from '@elastic/datemath';
import chrome from 'ui/chrome';
import moment from 'moment-timezone';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { VisualizeOptions } from 'plugins/watcher/models/visualize_options';
import { getWatchVisualizationData } from '../../../../lib/api';
import { WatchContext } from '../../watch_context';
import { aggTypes } from '../../../../models/watch/agg_types';
import { comparators } from '../../../../models/watch/comparators';

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
const getThreshold = (watch: any) => {
  return watch.threshold.slice(0, comparators[watch.thresholdComparator].requiredValues);
};
const getTimeBuckets = (watch: any) => {
  const domain = getDomain(watch);
  const timeBuckets = new TimeBuckets();
  timeBuckets.setBounds(domain);
  return timeBuckets;
};

const WatchVisualizationUi = () => {
  const { watch } = useContext(WatchContext);
  const [watchVisualizationData, setWatchVisualizationData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const loadWatchVisualizationData = async () => {
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
    setIsLoading(false);
    setWatchVisualizationData(visualizeData || {});
  };
  useEffect(
    () => {
      const handler = setTimeout(loadWatchVisualizationData, 500);
      return () => {
        clearTimeout(handler);
      };
    },
    [watch]
  );

  const timezone = getTimezone();
  const actualThreshold = getThreshold(watch);
  let maxY = actualThreshold[actualThreshold.length - 1];
  (Object.values(watchVisualizationData) as number[][][]).forEach(data => {
    data.forEach(([, y]) => {
      if (y > maxY) {
        maxY = y;
      }
    });
  });
  const dateFormatter = (d: number) => {
    return moment(d)
      .tz(timezone)
      .format(getTimeBuckets(watch).getScaledDateFormat());
  };
  const aggLabel = aggTypes[watch.aggType].text;

  if (isLoading) {
    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
      </Fragment>
    );
  }

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
          <Axis
            domain={{ max: maxY }}
            id={getAxisId('left')}
            title={aggLabel}
            position={Position.Left}
          />
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
          {actualThreshold.map((value: any, i: number) => {
            const specId = i === 0 ? 'threshold' : `threshold${i}`;
            return (
              <LineAnnotation
                annotationId={getAnnotationId(specId)}
                domainType={AnnotationDomainTypes.YDomain}
                dataValues={[{ dataValue: watch.threshold[i], details: specId }]}
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
