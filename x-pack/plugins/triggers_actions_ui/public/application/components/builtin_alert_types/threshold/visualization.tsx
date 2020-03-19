/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { IUiSettingsClient, HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  AnnotationDomainTypes,
  Axis,
  getAxisId,
  getSpecId,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import moment from 'moment-timezone';
import { EuiCallOut, EuiLoadingChart, EuiSpacer, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getThresholdAlertVisualizationData } from '../../../../common/lib/index_threshold_api';
import { AggregationType, Comparator } from '../../../../common/types';
import { AlertsContextValue } from '../../../context/alerts_context';
import { IndexThresholdAlertParams } from './types';
import { parseDuration } from '../../../../../../alerting/common/parse_duration';

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

const getDomain = (alertInterval: string) => {
  const VISUALIZE_INTERVALS = 30;
  let intervalMillis: number;

  try {
    intervalMillis = parseDuration(alertInterval);
  } catch (err) {
    intervalMillis = 1000 * 60; // default to one minute if not parseable
  }

  const now = Date.now();
  return {
    min: now - intervalMillis * VISUALIZE_INTERVALS,
    max: now,
  };
};

interface Props {
  alertParams: IndexThresholdAlertParams;
  alertInterval: string;
  aggregationTypes: { [key: string]: AggregationType };
  comparators: {
    [key: string]: Comparator;
  };
  alertsContext: AlertsContextValue;
}

type MetricResult = [number, number]; // [epochMillis, value]
export const ThresholdVisualization: React.FunctionComponent<Props> = ({
  alertParams,
  alertInterval,
  aggregationTypes,
  comparators,
  alertsContext,
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
  const { http, toastNotifications, charts, uiSettings, dataFieldsFormats } = alertsContext;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<undefined | any>(undefined);
  const [visualizationData, setVisualizationData] = useState<Record<string, MetricResult[]>>();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setVisualizationData(
          await getVisualizationData(alertWithoutActions, visualizeOptions, http)
        );
      } catch (e) {
        if (toastNotifications) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.alertAdd.unableToLoadVisualizationMessage',
              { defaultMessage: 'Unable to load visualization' }
            ),
          });
        }
        setError(e);
      } finally {
        setIsLoading(false);
      }
    })();
    /* eslint-disable react-hooks/exhaustive-deps */
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
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!charts || !uiSettings || !dataFieldsFormats) {
    return null;
  }
  const chartsTheme = charts.theme.useChartsTheme();

  const domain = getDomain(alertInterval);
  const visualizeOptions = {
    rangeFrom: new Date(domain.min).toISOString(),
    rangeTo: new Date(domain.max).toISOString(),
    interval: alertInterval,
  };

  // Fetching visualization data is independent of alert actions
  const alertWithoutActions = { ...alertParams, actions: [], type: 'threshold' };

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        title={<EuiLoadingChart size="xl" />}
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertAdd.loadingAlertVisualizationDescription"
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
          title={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertAdd.errorLoadingAlertVisualizationTitle"
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
    let maxY = actualThreshold[actualThreshold.length - 1] as any;

    (Object.values(visualizationData) as number[][][]).forEach(data => {
      data.forEach(([, y]) => {
        if (y > maxY) {
          maxY = y;
        }
      });
    });
    const dateFormatter = niceTimeFormatter([domain.min, domain.max]);
    const aggLabel = aggregationTypes[aggType].text;
    return (
      <div data-test-subj="alertVisualizationChart">
        {alertVisualizationDataKeys.length ? (
          <Chart size={['100%', 200]} renderer="canvas">
            <Settings
              theme={[customTheme(), chartsTheme]}
              xDomain={domain}
              showLegend={!!termField}
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
            {alertVisualizationDataKeys.map((key: string) => {
              return (
                <LineSeries
                  key={key}
                  id={getSpecId(key)}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  data={visualizationData[key]}
                  xAccessor={0}
                  yAccessors={[1]}
                  timeZone={timezone}
                />
              );
            })}
            {actualThreshold.map((_value: any, i: number) => {
              const specId = i === 0 ? 'threshold' : `threshold${i}`;
              return (
                <LineAnnotation
                  key={specId}
                  id={specId}
                  domainType={AnnotationDomainTypes.YDomain}
                  dataValues={[{ dataValue: threshold[i], details: specId }]}
                />
              );
            })}
          </Chart>
        ) : (
          <EuiCallOut
            size="s"
            title={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.thresholdPreviewChart.noDataTitle"
                defaultMessage="No data matches that query"
              />
            }
            color="warning"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertAdd.thresholdPreviewChart.dataDoesNotExistTextMessage"
              defaultMessage="Check your time range and filters to make sure they are correct"
            />
          </EuiCallOut>
        )}
      </div>
    );
  }

  return null;
};

// convert the data from the visualization API into something easier to digest with charts
async function getVisualizationData(model: any, visualizeOptions: any, http: HttpSetup) {
  const vizData = await getThresholdAlertVisualizationData({
    model,
    visualizeOptions,
    http,
  });
  const result: Record<string, Array<[number, number]>> = {};

  for (const groupMetrics of vizData.results) {
    result[groupMetrics.group] = groupMetrics.metrics.map(metricResult => [
      Date.parse(metricResult[0]),
      metricResult[1],
    ]);
  }

  return result;
}
