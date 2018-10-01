/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonEmpty,
  EuiIconTip,
  EuiToolTip
} from '@elastic/eui';

import {
  getExploreSeriesLink,
  isLabelLengthAboveThreshold
} from '../../util/chart_utils';
import { ExplorerChart } from './explorer_chart';
import { ExplorerChartLabel } from './components/explorer_chart_label';

const textTooManyBuckets = `This selection contains too many buckets to be displayed.
 The dashboard is best viewed over a shorter time range.`;
const textViewButton = 'Open in Single Metric Viewer';

export function ExplorerChartsContainer({
  seriesToPlot,
  layoutCellsPerChart,
  tooManyBuckets,
  mlSelectSeverityService
}) {
  const wrapLabel = seriesToPlot.some((series) => isLabelLengthAboveThreshold(series));

  return (
    <div className="explorer-charts">
      {(seriesToPlot.length > 0) &&
        seriesToPlot.map((series) => {

          // create a somewhat unique ID from charts metadata for React's key attribute
          const {
            jobId,
            detectorLabel,
            entityFields,
          } = series;
          const entities = entityFields.map((ef) => `${ef.fieldName}/${ef.fieldValue}`).join(',');
          const id = `${jobId}_${detectorLabel}_${entities}`;

          return (
            <div className={`ml-explorer-chart-container col-md-${layoutCellsPerChart}`} key={id}>
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
              <ExplorerChartLabel
                detectorLabel={detectorLabel}
                entityFields={entityFields}
                infoTooltip={series.infoTooltip}
                wrapLabel={wrapLabel}
              />
              <ExplorerChart
                tooManyBuckets={tooManyBuckets}
                seriesConfig={series}
                mlSelectSeverityService={mlSelectSeverityService}
              />
            </div>
          );
        })
      }
    </div>
  );
}
ExplorerChartsContainer.propTypes = {
  seriesToPlot: PropTypes.array.isRequired,
  layoutCellsPerChart: PropTypes.number.isRequired,
  tooManyBuckets: PropTypes.bool.isRequired,
  mlSelectSeverityService: PropTypes.object.isRequired,
  mlChartTooltipService: PropTypes.object.isRequired
};
