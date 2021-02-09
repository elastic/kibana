/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiToolTip,
} from '@elastic/eui';

import {
  getChartType,
  getExploreSeriesLink,
  isLabelLengthAboveThreshold,
} from '../../util/chart_utils';
import { ExplorerChartDistribution } from './explorer_chart_distribution';
import { ExplorerChartSingleMetric } from './explorer_chart_single_metric';
import { EmbeddedMapComponentWrapper } from './explorer_chart_embedded_map';
import { ExplorerChartLabel } from './components/explorer_chart_label';

import { CHART_TYPE } from '../explorer_constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MlTooltipComponent } from '../../components/chart_tooltip';
import { withKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ML_APP_URL_GENERATOR } from '../../../../common/constants/ml_url_generator';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';
import { addItemToRecentlyAccessed } from '../../util/recently_accessed';
import { ExplorerChartsErrorCallOuts } from './explorer_charts_error_callouts';

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
  mlUrlGenerator,
  basePath,
}) {
  const [explorerSeriesLink, setExplorerSeriesLink] = useState();

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      if (!isCancelled && series.functionDescription !== ML_JOB_AGGREGATION.LAT_LONG) {
        const singleMetricViewerLink = await getExploreSeriesLink(mlUrlGenerator, series);
        setExplorerSeriesLink(singleMetricViewerLink);
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [mlUrlGenerator, series]);

  const addToRecentlyAccessed = useCallback(() => {
    addItemToRecentlyAccessed('timeseriesexplorer', series.jobId, explorerSeriesLink);
  }, [explorerSeriesLink]);
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
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <ExplorerChartLabel
            detectorLabel={DetectorLabel}
            entityFields={entityFields}
            infoTooltip={{ ...series.infoTooltip, chartType }}
            wrapLabel={wrapLabel}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div className="ml-explorer-chart-icons">
            {tooManyBuckets && (
              <span className="ml-explorer-chart-icon">
                <EuiIconTip
                  content={textTooManyBuckets}
                  position="top"
                  size="s"
                  type="alert"
                  color="warning"
                />
              </span>
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
                  href={`${basePath}/app/ml${explorerSeriesLink}`}
                  onClick={addToRecentlyAccessed}
                >
                  <FormattedMessage id="xpack.ml.explorer.charts.viewLabel" defaultMessage="View" />
                </EuiButtonEmpty>
              </EuiToolTip>
            )}
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
                  tooManyBuckets={tooManyBuckets}
                  seriesConfig={series}
                  severity={severity}
                  tooltipService={tooltipService}
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
                  tooManyBuckets={tooManyBuckets}
                  seriesConfig={series}
                  severity={severity}
                  tooltipService={tooltipService}
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
}) => {
  const {
    services: {
      http: { basePath },
      share: {
        urlGenerators: { getUrlGenerator },
      },
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

  const mlUrlGenerator = useMemo(() => getUrlGenerator(ML_APP_URL_GENERATOR), [getUrlGenerator]);

  // <EuiFlexGrid> doesn't allow a setting of `columns={1}` when chartsPerRow would be 1.
  // If that's the case we trick it doing that with the following settings:
  const chartsWidth = chartsPerRow === 1 ? 'calc(100% - 20px)' : 'auto';
  const chartsColumns = chartsPerRow === 1 ? 0 : chartsPerRow;

  const wrapLabel = seriesToUse.some((series) => isLabelLengthAboveThreshold(series));
  return (
    <>
      <ExplorerChartsErrorCallOuts errorMessagesByType={errorMessages} />
      <EuiFlexGrid columns={chartsColumns}>
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
                mlUrlGenerator={mlUrlGenerator}
                basePath={basePath.get()}
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGrid>
    </>
  );
};

export const ExplorerChartsContainer = withKibana(ExplorerChartsContainerUI);
