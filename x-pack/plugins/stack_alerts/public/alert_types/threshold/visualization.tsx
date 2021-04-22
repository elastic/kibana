/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { IUiSettingsClient, HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { interval } from 'rxjs';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import moment from 'moment-timezone';
import {
  EuiCallOut,
  EuiLoadingChart,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { FieldFormatsStart } from 'src/plugins/data/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  getThresholdAlertVisualizationData,
  GetThresholdAlertVisualizationDataParams,
} from './index_threshold_api';
import { AggregationType, Comparator } from '../../../../triggers_actions_ui/public';
import { IndexThresholdAlertParams } from './types';
import { parseDuration } from '../../../../alerting/common/parse_duration';

const customTheme = () => {
  return {
    lineSeriesStyle: {
      line: {
        strokeWidth: 3,
      },
      point: {
        visible: false,
      },
    },
  };
};

const getTimezone = (uiSettings: IUiSettingsClient) => {
  const config = uiSettings;
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

const getDomain = (alertInterval: string, startAt: Date) => {
  const VISUALIZE_INTERVALS = 30;
  let intervalMillis: number;

  try {
    intervalMillis = parseDuration(alertInterval);
  } catch (err) {
    intervalMillis = 1000 * 60; // default to one minute if not parseable
  }

  return {
    min: startAt.getTime() - intervalMillis * VISUALIZE_INTERVALS,
    max: startAt.getTime(),
  };
};

interface Props {
  alertParams: IndexThresholdAlertParams;
  alertInterval: string;
  aggregationTypes: { [key: string]: AggregationType };
  comparators: {
    [key: string]: Comparator;
  };
  refreshRateInMilliseconds?: number;
  charts: ChartsPluginSetup;
  dataFieldsFormats: FieldFormatsStart;
}

const DEFAULT_REFRESH_RATE = 5000;

enum LoadingStateType {
  FirstLoad,
  Refresh,
  Idle,
}

type MetricResult = [number, number]; // [epochMillis, value]
export const ThresholdVisualization: React.FunctionComponent<Props> = ({
  alertParams,
  alertInterval,
  aggregationTypes,
  comparators,
  refreshRateInMilliseconds = DEFAULT_REFRESH_RATE,
  charts,
  dataFieldsFormats,
}) => {
  const {
    index,
    timeField,
    aggType,
    aggField,
    termSize,
    termField,
    thresholdComparator,
    timeWindowSize,
    timeWindowUnit,
    groupBy,
    threshold,
  } = alertParams;
  const { http, notifications, uiSettings } = useKibana().services;
  const [loadingState, setLoadingState] = useState<LoadingStateType | null>(null);
  const [error, setError] = useState<undefined | Error>(undefined);
  const [visualizationData, setVisualizationData] = useState<Record<string, MetricResult[]>>();
  const [startVisualizationAt, setStartVisualizationAt] = useState<Date>(new Date());

  useEffect(() => {
    const source = interval(refreshRateInMilliseconds);
    const subscription = source.subscribe((val: number) => {
      setStartVisualizationAt(new Date());
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshRateInMilliseconds]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingState(loadingState ? LoadingStateType.Refresh : LoadingStateType.FirstLoad);
        setVisualizationData(
          await getVisualizationData(alertWithoutActions, visualizeOptions, http!)
        );
      } catch (e) {
        if (notifications) {
          notifications.toasts.addDanger({
            title: i18n.translate(
              'xpack.stackAlerts.threshold.ui.visualization.unableToLoadVisualizationMessage',
              { defaultMessage: 'Unable to load visualization' }
            ),
          });
        }
        setError(e);
      } finally {
        setLoadingState(LoadingStateType.Idle);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    index,
    timeField,
    aggType,
    aggField,
    termSize,
    termField,
    thresholdComparator,
    timeWindowSize,
    timeWindowUnit,
    groupBy,
    threshold,
    startVisualizationAt,
  ]);

  if (!charts || !uiSettings || !dataFieldsFormats) {
    return null;
  }
  const chartsTheme = charts.theme.useChartsTheme();
  const chartsBaseTheme = charts.theme.useChartsBaseTheme();

  const domain = getDomain(alertInterval, startVisualizationAt);
  const visualizeOptions = {
    rangeFrom: new Date(domain.min).toISOString(),
    rangeTo: new Date(domain.max).toISOString(),
    interval: alertInterval,
  };

  // Fetching visualization data is independent of alert actions
  const alertWithoutActions = { ...alertParams, actions: [], type: 'threshold' };

  if (loadingState === LoadingStateType.FirstLoad) {
    return (
      <EuiEmptyPrompt
        data-test-subj="firstLoad"
        title={<EuiLoadingChart size="xl" />}
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.stackAlerts.threshold.ui.visualization.loadingAlertVisualizationDescription"
              defaultMessage="Loading alert visualization…"
            />
          </EuiText>
        }
      />
    );
  }

  if (error) {
    return (
      <Fragment>
        <EuiSpacer size="l" />
        <EuiCallOut
          data-test-subj="errorCallout"
          title={
            <FormattedMessage
              id="xpack.stackAlerts.threshold.ui.visualization.errorLoadingAlertVisualizationTitle"
              defaultMessage="Cannot load alert visualization"
              values={{}}
            />
          }
          color="danger"
          iconType="alert"
        >
          {error}
        </EuiCallOut>
      </Fragment>
    );
  }

  const getThreshold = () => {
    return thresholdComparator
      ? threshold.slice(0, comparators[thresholdComparator].requiredValues)
      : [];
  };

  if (visualizationData) {
    const alertVisualizationDataKeys = Object.keys(visualizationData);
    const timezone = getTimezone(uiSettings);
    const actualThreshold = getThreshold();
    let maxY = actualThreshold[actualThreshold.length - 1];

    (Object.values(visualizationData) as number[][][]).forEach((data) => {
      data.forEach(([, y]) => {
        if (y > maxY) {
          maxY = y;
        }
      });
    });
    const dateFormatter = niceTimeFormatter([domain.min, domain.max]);
    const aggLabel = aggregationTypes[aggType].text;
    return (
      <div data-test-subj="alertVisualizationChart" style={{ position: 'relative' }}>
        {loadingState === LoadingStateType.Refresh ? (
          <EuiLoadingSpinner size="l" style={{ position: 'absolute', top: '8%', right: '5%' }} />
        ) : (
          <Fragment />
        )}
        {alertVisualizationDataKeys.length ? (
          <Chart size={['100%', 200]} renderer="canvas">
            <Settings
              theme={[customTheme(), chartsTheme]}
              baseTheme={chartsBaseTheme}
              xDomain={domain}
              showLegend={!!termField}
              showLegendExtra
              legendPosition={Position.Bottom}
            />
            <Axis
              id="bottom"
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            <Axis domain={{ max: maxY }} id="left" title={aggLabel} position={Position.Left} />
            {alertVisualizationDataKeys.map((key: string) => {
              return (
                <LineSeries
                  key={key}
                  id={key}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  data={visualizationData[key]}
                  xAccessor={0}
                  yAccessors={[1]}
                  timeZone={timezone}
                />
              );
            })}
            {actualThreshold.map((_value: number, thresholdIndex: number) => {
              const specId = thresholdIndex === 0 ? 'threshold' : `threshold${thresholdIndex}`;
              return (
                <LineAnnotation
                  key={specId}
                  id={specId}
                  domainType={AnnotationDomainType.YDomain}
                  dataValues={[{ dataValue: threshold[thresholdIndex], details: specId }]}
                />
              );
            })}
          </Chart>
        ) : (
          <EuiCallOut
            data-test-subj="noDataCallout"
            size="s"
            title={
              <FormattedMessage
                id="xpack.stackAlerts.threshold.ui.visualization.thresholdPreviewChart.noDataTitle"
                defaultMessage="No data matches this query"
              />
            }
            color="warning"
          >
            <FormattedMessage
              id="xpack.stackAlerts.threshold.ui.visualization.thresholdPreviewChart.dataDoesNotExistTextMessage"
              defaultMessage="Check that your time range and filters are correct."
            />
          </EuiCallOut>
        )}
      </div>
    );
  }

  return null;
};

// convert the data from the visualization API into something easier to digest with charts
async function getVisualizationData(
  model: IndexThresholdAlertParams,
  visualizeOptions: GetThresholdAlertVisualizationDataParams['visualizeOptions'],
  http: HttpSetup
) {
  const vizData = await getThresholdAlertVisualizationData({
    model,
    visualizeOptions,
    http,
  });
  const result: Record<string, Array<[number, number]>> = {};

  for (const groupMetrics of vizData.results) {
    result[groupMetrics.group] = groupMetrics.metrics.map((metricResult) => [
      Date.parse(metricResult[0]),
      metricResult[1],
    ]);
  }

  return result;
}
