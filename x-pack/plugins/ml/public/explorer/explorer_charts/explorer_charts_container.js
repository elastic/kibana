/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';

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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const textTooManyBuckets = i18n.translate('xpack.ml.explorer.charts.tooManyBucketsDescription', {
  defaultMessage: 'This selection contains too many buckets to be displayed.' +
    'The dashboard is best viewed over a shorter time range.'
});
const textViewButton = i18n.translate('xpack.ml.explorer.charts.openInSingleMetricViewerButtonLabel', {
  defaultMessage: 'Open in Single Metric Viewer'
});

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
          <FormattedMessage
            id="xpack.ml.explorer.charts.detectorLabel"
            defaultMessage="{detectorLabel}{br}y-axis event distribution split by &quot;{fieldName}&quot;"
            values={{
              detectorLabel,
              br: <br />,
              fieldName: byField.fieldName
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
            <EuiToolTip
              position="top"
              content={textViewButton}
            >
              <EuiButtonEmpty
                iconSide="right"
                iconType="stats"
                size="xs"
                onClick={() => window.open(getExploreSeriesLink(series), '_blank')}
              >
                <FormattedMessage
                  id="xpack.ml.explorer.charts.viewLabel"
                  defaultMessage="View"
                />
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
            />
          );
        }
        return (
          <ExplorerChartSingleMetric
            tooManyBuckets={tooManyBuckets}
            seriesConfig={series}
          />
        );
      })()}
    </React.Fragment>
  );
}

// Flex layout wrapper for all explorer charts
export class ExplorerChartsContainer extends React.Component {
  componentDidMount() {
    // Create a div for the tooltip.
    $('.ml-explorer-charts-tooltip').remove();
    $('body').append('<div class="ml-explorer-tooltip ml-explorer-charts-tooltip" style="opacity:0; display: none;">');
  }

  componentWillUnmount() {
    // Remove div for the tooltip.
    $('.ml-explorer-charts-tooltip').remove();
  }

  render() {
    const {
      chartsPerRow,
      seriesToPlot,
      tooManyBuckets
    } = this.props;

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
              wrapLabel={wrapLabel}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }
}
