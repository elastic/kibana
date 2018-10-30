/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiToolTip
} from '@elastic/eui';

import {
  getChartType,
  getExploreSeriesLink,
  isLabelLengthAboveThreshold
} from '../../util/chart_utils';
import { ExplorerChartDistribution } from './explorer_chart_distribution';
import { ExplorerChartSingleMetric } from './explorer_chart_single_metric';
import { ExplorerChartLabel } from './components/explorer_chart_label';

import { CHART_TYPE } from '../explorer_constants';

const textTooManyBuckets = `This selection contains too many buckets to be displayed.
 The dashboard is best viewed over a shorter time range.`;
const textViewButton = 'Open in Single Metric Viewer';

// create a somewhat unique ID
// from charts metadata for React's key attribute
function getChartId(series) {
  const {
    jobId,
    detectorLabel,
    entityFields
  } = series;
  const entities = entityFields.map((ef) => `${ef.fieldName}/${ef.fieldValue}`).join(',');
  const id = `${jobId}_${detectorLabel}_${entities}`;
  return id;
}

// Wrapper for a single explorer chart
function ExplorerChartContainer({
  series,
  tooManyBuckets,
  mlSelectSeverityService,
  wrapLabel
}) {
  const {
    detectorLabel,
    entityFields
  } = series;

  const chartType = getChartType(series);
  let DetectorLabel = <React.Fragment>{detectorLabel}</React.Fragment>;

  if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
    const byField = series.entityFields.find(d => d.fieldType === 'by');
    if (typeof byField !== 'undefined') {
      DetectorLabel = (
        <React.Fragment>
          {detectorLabel}<br />y-axis event distribution split by &quot;{byField.fieldName}&quot;
        </React.Fragment>
      );
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
            <EuiToolTip
              position="top"
              content={textViewButton}
            >
              <EuiButtonEmpty
                iconSide="right"
                iconType="popout"
                size="xs"
                onClick={() => window.open(getExploreSeriesLink(series), '_blank')}
              >
                View
              </EuiButtonEmpty>
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {(() => {
        if (chartType === CHART_TYPE.EVENT_DISTRIBUTION || chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
          return (
            <ExplorerChartDistribution
              tooManyBuckets={tooManyBuckets}
              seriesConfig={series}
              mlSelectSeverityService={mlSelectSeverityService}
            />
          );
        }
        return (
          <ExplorerChartSingleMetric
            tooManyBuckets={tooManyBuckets}
            seriesConfig={series}
            mlSelectSeverityService={mlSelectSeverityService}
          />
        );
      })()}
    </React.Fragment>
  );
}

// Flex layout wrapper for all explorer charts
export function ExplorerChartsContainer({
  chartsPerRow,
  seriesToPlot,
  tooManyBuckets,
  mlSelectSeverityService
}) {
  // <EuiFlexGrid> doesn't allow a setting of `columns={1}` when chartsPerRow would be 1.
  // If that's the case we trick it doing that with the following settings:
  const chartsWidth = (chartsPerRow === 1) ? 'calc(100% - 20px)' : 'auto';
  const chartsColumns = (chartsPerRow === 1) ? 0 : chartsPerRow;

  const wrapLabel = seriesToPlot.some((series) => isLabelLengthAboveThreshold(series));

  return (
    <EuiFlexGrid columns={chartsColumns}>
      {(seriesToPlot.length > 0) && seriesToPlot.map((series) => (
        <EuiFlexItem key={getChartId(series)} className="ml-explorer-chart-container" style={{ minWidth: chartsWidth }}>
          <ExplorerChartContainer
            series={series}
            tooManyBuckets={tooManyBuckets}
            mlSelectSeverityService={mlSelectSeverityService}
            wrapLabel={wrapLabel}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}
ExplorerChartsContainer.propTypes = {
  seriesToPlot: PropTypes.array.isRequired,
  tooManyBuckets: PropTypes.bool.isRequired,
  mlSelectSeverityService: PropTypes.object.isRequired,
  mlChartTooltipService: PropTypes.object.isRequired
};
