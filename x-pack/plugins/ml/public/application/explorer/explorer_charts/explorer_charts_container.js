/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './_index.scss';

import React, { useEffect, useState, useCallback, useRef } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import {
  getChartType,
  getExploreSeriesLink,
  isLabelLengthAboveThreshold,
} from '../../util/chart_utils';
import { ExplorerChartDistribution } from './explorer_chart_distribution';
import { ExplorerChartSingleMetric } from './explorer_chart_single_metric';
import { ExplorerChartLabel } from './components/explorer_chart_label';

import { CHART_TYPE } from '../explorer_constants';
import { SEARCH_QUERY_LANGUAGE } from '../../../../common/constants/search';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MlTooltipComponent } from '../../components/chart_tooltip';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';
import { getInitialAnomaliesLayers } from '../../../maps/util';
import { APP_ID as MAPS_APP_ID } from '@kbn/maps-plugin/common';
import { MAPS_APP_LOCATOR } from '@kbn/maps-plugin/public';
import { ExplorerChartsErrorCallOuts } from './explorer_charts_error_callouts';
import { addItemToRecentlyAccessed } from '../../util/recently_accessed';
import { EmbeddedMapComponentWrapper } from './explorer_chart_embedded_map';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { Chart, Settings } from '@elastic/charts';
import useObservable from 'react-use/lib/useObservable';
import { escapeKueryForFieldValuePair } from '../../util/string_utils';

const textTooManyBuckets = i18n.translate('xpack.ml.explorer.charts.tooManyBucketsDescription', {
  defaultMessage:
    'This selection contains too many buckets to be displayed. You should shorten the time range of the view or narrow the selection in the timeline.',
});

const textViewButton = i18n.translate(
  'xpack.ml.explorer.charts.openInSingleMetricViewerButtonLabel',
  {
    defaultMessage: 'Open in Single Metric Viewer',
  }
);
const mapsPluginMessage = i18n.translate('xpack.ml.explorer.charts.mapsPluginMissingMessage', {
  defaultMessage: 'maps or embeddable start plugin not found',
});
const openInMapsPluginMessage = i18n.translate('xpack.ml.explorer.charts.openInMapsPluginMessage', {
  defaultMessage: 'Open in Maps',
});

export function getEntitiesQuery(series) {
  const queryString = series.entityFields
    ?.map(({ fieldName, fieldValue }) => escapeKueryForFieldValuePair(fieldName, fieldValue))
    .join(' or ');
  const query = {
    language: SEARCH_QUERY_LANGUAGE.KUERY,
    query: queryString,
  };
  return { query, queryString };
}

// create a somewhat unique ID
// from charts metadata for React's key attribute
function getChartId(series) {
  const { jobId, detectorLabel, entityFields } = series;
  const entities = entityFields.map((ef) => `${ef.fieldName}/${ef.fieldValue}`).join(',');
  const id = `${jobId}_${detectorLabel}_${entities}`;
  return id;
}

// Wrapper for a single explorer chart
function ExplorerChartContainer({
  series,
  severity,
  tooManyBuckets,
  wrapLabel,
  mlLocator,
  timeBuckets,
  timefilter,
  timeRange,
  onSelectEntity,
  recentlyAccessed,
  tooManyBucketsCalloutMsg,
  showSelectedInterval,
  chartsService,
}) {
  const [explorerSeriesLink, setExplorerSeriesLink] = useState('');
  const [mapsLink, setMapsLink] = useState('');

  const {
    services: {
      share,
      application: { navigateToApp },
    },
  } = useMlKibana();

  const getMapsLink = useCallback(async () => {
    const { queryString, query } = getEntitiesQuery(series);
    const initialLayers = getInitialAnomaliesLayers(series.jobId);

    const locator = share.url.locators.get(MAPS_APP_LOCATOR);
    const location = await locator.getLocation({
      initialLayers: initialLayers,
      timeRange: timeRange ?? timefilter?.getTime(),
      ...(queryString !== undefined ? { query } : {}),
    });

    return location;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series?.jobId, timeRange]);

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      // Prioritize timeRange from embeddable panel or case
      // Else use the time range from data plugins's timefilters service
      let mergedTimeRange = timeRange;
      const bounds = timefilter?.getActiveBounds();
      if (!timeRange && bounds) {
        mergedTimeRange = {
          from: bounds.min.toISOString(),
          to: bounds.max.toISOString(),
        };
      }

      if (!isCancelled && series.functionDescription !== ML_JOB_AGGREGATION.LAT_LONG) {
        try {
          const singleMetricViewerLink = await getExploreSeriesLink(
            mlLocator,
            series,
            mergedTimeRange
          );
          setExplorerSeriesLink(singleMetricViewerLink);
        } catch (error) {
          setExplorerSeriesLink('');
        }
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mlLocator, series, timeRange]);

  useEffect(
    function getMapsPluginLink() {
      let isCancelled = false;
      if (series && getChartType(series) === CHART_TYPE.GEO_MAP) {
        const generateLink = async () => {
          try {
            const mapsLink = await getMapsLink();
            if (!isCancelled) {
              setMapsLink(mapsLink?.path);
            }
          } catch (error) {
            console.error(error);
            setMapsLink('');
          }
        };
        generateLink().catch(console.error);
      }
      return () => {
        isCancelled = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series]
  );

  const chartRef = useRef(null);

  const { euiTheme } = useEuiTheme();
  const chartTheme = chartsService.theme.useChartsTheme();

  const handleCursorUpdate = useActiveCursor(chartsService.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const cursor = useObservable(chartsService.activeCursor.activeCursor$)?.cursor;

  const addToRecentlyAccessed = useCallback(() => {
    if (recentlyAccessed) {
      addItemToRecentlyAccessed(
        'timeseriesexplorer',
        series.jobId,
        explorerSeriesLink,
        recentlyAccessed
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerSeriesLink, recentlyAccessed]);
  const { detectorLabel, entityFields } = series;

  const chartType = getChartType(series);
  let DetectorLabel = <React.Fragment>{detectorLabel}</React.Fragment>;

  if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
    const byField = series.entityFields.find((d) => d.fieldType === 'by');
    if (typeof byField !== 'undefined') {
      DetectorLabel = (
        <React.Fragment>
          <FormattedMessage
            id="xpack.ml.explorer.charts.detectorLabel"
            defaultMessage='{detectorLabel}{br}y-axis event distribution split by "{fieldName}"'
            values={{
              detectorLabel,
              br: <br />,
              fieldName: byField.fieldName,
            }}
          />
        </React.Fragment>
      );
      wrapLabel = true;
    }
  }

  return (
    <React.Fragment>
      {/* Creating an empty elastic chart container here */}
      {/* so that we can use chart's ref which controls the activeCursor api */}
      <div style={{ width: 0, height: 0 }}>
        <Chart ref={chartRef}>
          <Settings noResults={<div />} />
        </Chart>
      </div>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <ExplorerChartLabel
            detectorLabel={DetectorLabel}
            entityFields={entityFields}
            infoTooltip={{ ...series.infoTooltip, chartType }}
            wrapLabel={wrapLabel}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div
            css={css`
              padding: ${euiTheme.size.xs};
            `}
          >
            {tooManyBuckets && (
              <EuiIconTip
                content={tooManyBucketsCalloutMsg ?? textTooManyBuckets}
                position="top"
                size="s"
                type="alert"
                color="warning"
              />
            )}
            {explorerSeriesLink && (
              <EuiToolTip position="top" content={textViewButton}>
                {/* href needs to be full link with base path while ChromeRecentlyAccessed requires only relative path */}
                {/* disabling because we need button to behave as link and to have a callback */}
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiButtonEmpty
                  iconSide="right"
                  iconType="visLine"
                  size="xs"
                  href={explorerSeriesLink}
                  onClick={addToRecentlyAccessed}
                >
                  <FormattedMessage id="xpack.ml.explorer.charts.viewLabel" defaultMessage="View" />
                </EuiButtonEmpty>
              </EuiToolTip>
            )}
            {chartType === CHART_TYPE.GEO_MAP && mapsLink ? (
              <EuiToolTip position="top" content={openInMapsPluginMessage}>
                <EuiButtonEmpty
                  iconSide="right"
                  iconType="logoMaps"
                  size="xs"
                  onClick={async () => {
                    await navigateToApp(MAPS_APP_ID, { path: mapsLink });
                  }}
                >
                  <FormattedMessage
                    id="xpack.ml.explorer.charts.viewInMapsLabel"
                    defaultMessage="View"
                  />
                </EuiButtonEmpty>
              </EuiToolTip>
            ) : null}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {(() => {
        if (chartType === CHART_TYPE.GEO_MAP) {
          return (
            <MlTooltipComponent>
              {(tooltipService) => (
                <EmbeddedMapComponentWrapper
                  seriesConfig={series}
                  tooltipService={tooltipService}
                />
              )}
            </MlTooltipComponent>
          );
        }

        if (
          chartType === CHART_TYPE.EVENT_DISTRIBUTION ||
          chartType === CHART_TYPE.POPULATION_DISTRIBUTION
        ) {
          return (
            <MlTooltipComponent>
              {(tooltipService) => (
                <ExplorerChartDistribution
                  timeBuckets={timeBuckets}
                  tooManyBuckets={tooManyBuckets}
                  seriesConfig={series}
                  severity={severity}
                  tooltipService={tooltipService}
                  showSelectedInterval={showSelectedInterval}
                  onPointerUpdate={handleCursorUpdate}
                  chartTheme={chartTheme}
                  cursor={cursor}
                />
              )}
            </MlTooltipComponent>
          );
        }
        if (chartType === CHART_TYPE.SINGLE_METRIC) {
          return (
            <MlTooltipComponent>
              {(tooltipService) => (
                <ExplorerChartSingleMetric
                  timeBuckets={timeBuckets}
                  tooManyBuckets={tooManyBuckets}
                  seriesConfig={series}
                  severity={severity}
                  tooltipService={tooltipService}
                  showSelectedInterval={showSelectedInterval}
                  onPointerUpdate={handleCursorUpdate}
                  chartTheme={chartTheme}
                  cursor={cursor}
                />
              )}
            </MlTooltipComponent>
          );
        }
      })()}
    </React.Fragment>
  );
}

// Flex layout wrapper for all explorer charts
export const ExplorerChartsContainerUI = ({
  chartsPerRow,
  seriesToPlot,
  severity,
  tooManyBuckets,
  kibana,
  errorMessages,
  mlLocator,
  timeBuckets,
  timefilter,
  timeRange,
  onSelectEntity,
  tooManyBucketsCalloutMsg,
  showSelectedInterval,
  chartsService,
}) => {
  const {
    services: {
      chrome: { recentlyAccessed },
      embeddable: embeddablePlugin,
      maps: mapsPlugin,
    },
  } = kibana;

  let seriesToPlotFiltered;

  if (!embeddablePlugin || !mapsPlugin) {
    seriesToPlotFiltered = [];
    // Show missing plugin callout
    seriesToPlot.forEach((series) => {
      if (series.functionDescription === 'lat_long') {
        if (errorMessages[mapsPluginMessage] === undefined) {
          errorMessages[mapsPluginMessage] = new Set([series.jobId]);
        } else {
          errorMessages[mapsPluginMessage].add(series.jobId);
        }
      } else {
        seriesToPlotFiltered.push(series);
      }
    });
  }

  const seriesToUse = seriesToPlotFiltered !== undefined ? seriesToPlotFiltered : seriesToPlot;

  // <EuiFlexGrid> doesn't allow a setting of `columns={1}` when chartsPerRow would be 1.
  // If that's the case we trick it doing that with the following settings:
  const chartsWidth = chartsPerRow === 1 ? 'calc(100% - 20px)' : 'auto';
  const chartsColumns = chartsPerRow === 1 ? 0 : chartsPerRow;

  const wrapLabel = seriesToUse.some((series) => isLabelLengthAboveThreshold(series));
  return (
    <>
      <ExplorerChartsErrorCallOuts errorMessagesByType={errorMessages} />
      <EuiFlexGrid
        columns={chartsColumns}
        gutterSize="m"
        data-test-subj="mlExplorerChartsContainer"
      >
        {seriesToUse.length > 0 &&
          seriesToUse.map((series) => (
            <EuiFlexItem
              key={getChartId(series)}
              className="ml-explorer-chart-container"
              style={{ minWidth: chartsWidth }}
            >
              <ExplorerChartContainer
                series={series}
                severity={severity}
                tooManyBuckets={tooManyBuckets}
                wrapLabel={wrapLabel}
                mlLocator={mlLocator}
                timeBuckets={timeBuckets}
                timefilter={timefilter}
                timeRange={timeRange}
                onSelectEntity={onSelectEntity}
                recentlyAccessed={recentlyAccessed}
                tooManyBucketsCalloutMsg={tooManyBucketsCalloutMsg}
                showSelectedInterval={showSelectedInterval}
                chartsService={chartsService}
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGrid>
    </>
  );
};

export const ExplorerChartsContainer = withKibana(ExplorerChartsContainerUI);
