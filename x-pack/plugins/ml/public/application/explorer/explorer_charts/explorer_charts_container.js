/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

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
import { ExplorerChartLabel } from './components/explorer_chart_label';

import { CHART_TYPE } from '../explorer_constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MlTooltipComponent } from '../../components/chart_tooltip';
import { withKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ML_APP_URL_GENERATOR } from '../../../../common/constants/ml_url_generator';
import { PLUGIN_ID } from '../../../../common/constants/app';
import { addItemToRecentlyAccessed } from '../../util/recently_accessed';

const textTooManyBuckets = i18n.translate('xpack.ml.explorer.charts.tooManyBucketsDescription', {
  defaultMessage:
    'This selection contains too many buckets to be displayed.' +
    'The dashboard is best viewed over a shorter time range.',
});
const textViewButton = i18n.translate(
  'xpack.ml.explorer.charts.openInSingleMetricViewerButtonLabel',
  {
    defaultMessage: 'Open in Single Metric Viewer',
  }
);

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
  navigateToApp,
  mlUrlGenerator,
}) {
  const redirectToSingleMetricViewer = useCallback(async () => {
    const singleMetricViewerLink = await getExploreSeriesLink(mlUrlGenerator, series);
    addItemToRecentlyAccessed('timeseriesexplorer', series.jobId, singleMetricViewerLink);

    await navigateToApp(PLUGIN_ID, {
      path: singleMetricViewerLink,
    });
  }, [mlUrlGenerator]);

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
            <EuiToolTip position="top" content={textViewButton}>
              <EuiButtonEmpty
                iconSide="right"
                iconType="visLine"
                size="xs"
                onClick={redirectToSingleMetricViewer}
              >
                <FormattedMessage id="xpack.ml.explorer.charts.viewLabel" defaultMessage="View" />
              </EuiButtonEmpty>
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {(() => {
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
}) => {
  const {
    services: {
      application: { navigateToApp },

      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = kibana;
  const mlUrlGenerator = getUrlGenerator(ML_APP_URL_GENERATOR);

  // <EuiFlexGrid> doesn't allow a setting of `columns={1}` when chartsPerRow would be 1.
  // If that's the case we trick it doing that with the following settings:
  const chartsWidth = chartsPerRow === 1 ? 'calc(100% - 20px)' : 'auto';
  const chartsColumns = chartsPerRow === 1 ? 0 : chartsPerRow;

  const wrapLabel = seriesToPlot.some((series) => isLabelLengthAboveThreshold(series));

  return (
    <EuiFlexGrid columns={chartsColumns}>
      {seriesToPlot.length > 0 &&
        seriesToPlot.map((series) => (
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
              navigateToApp={navigateToApp}
              mlUrlGenerator={mlUrlGenerator}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGrid>
  );
};

export const ExplorerChartsContainer = withKibana(ExplorerChartsContainerUI);
