/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiIconTip } from '@elastic/eui';

import { getExploreSeriesLink } from '../../util/chart_utils';
import { ExplorerChart } from './explorer_chart';
import { ExplorerChartTooltip } from './explorer_chart_tooltip';

export function ExplorerChartsContainer({
  seriesToPlot,
  layoutCellsPerChart,
  tooManyBuckets,
  mlSelectSeverityService
}) {
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
              <div className="explorer-chart-label">
                <div className="explorer-chart-label-fields">
                  {(detectorLabel.length > 0 && entityFields.length > 0) && (
                    <span>{detectorLabel} - </span>
                  )}
                  {(detectorLabel.length > 0 && entityFields.length === 0) && (
                    <span>{detectorLabel}</span>
                  )}
                  {entityFields.map((entity, j) => {
                    return (
                      <span key={j}>{entity.fieldName} {entity.fieldValue}</span>
                    );
                  })}
                </div>
                <EuiIconTip content={<ExplorerChartTooltip {...series.infoTooltip} />} position="left" size="s" />
                {tooManyBuckets && (
                  <EuiIconTip
                    content={'This selection contains too many buckets to be displayed.' +
                     'The dashboard is best viewed over a shorter time range.'}
                    position="bottom"
                    size="s"
                    type="alert"
                    color="warning"
                  />
                )}
                <a className="euiLink" onClick={() => window.open(getExploreSeriesLink(series), '_blank')}>
                  View <i className="fa fa-external-link" aria-hidden="true" />
                </a>
              </div>
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
