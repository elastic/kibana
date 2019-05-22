/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import '../../directives/moment';
import { isNumber, forEach, merge } from 'lodash';
import { uiModules } from 'ui/modules';
import { TimeBuckets } from 'ui/time_buckets';
import 'plugins/watcher/components/flot_chart';
import 'plugins/watcher/components/chart_tooltip';
import template from './threshold_preview_chart.html';
import { COLORS, LINE_WIDTHS, MARGINS } from './constants';

const app = uiModules.get('xpack/watcher');

app.directive('thresholdPreviewChart', function ($injector) {
  const config = $injector.get('config');

  moment.tz.setDefault(config.get('dateFormat:tz'));

  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      // A single series (array) of (x, y) points
      // - Format: [ [ xTimestamp1, yValue1 ], [ xTimestamp2, yValue2 ], ... ]
      // - Units for timestamp values (xTimestamp1, xTimestamp2, etc.) are ms-since-epoch
      // - Timestamp values are assumed to be in UTC timezone
      // - Series array must be sorted in ascending order of timestamp values
      series: '=',

      startDate: '=',
      endDate: '=',

      // A single y-axis value
      thresholdValue: '='
    },
    controllerAs: 'thresholdPreviewChart',
    bindToController: true,
    controller: class ThresholdPreviewChartController {
      constructor($scope) {

        this.options = {
          colors: [ COLORS.SERIES_LINE ],
          grid: {
            aboveData: true,
            borderColor: COLORS.CHART_BORDER,
            borderWidth: { top: 0, right: 0, bottom: 2, left: 2 },
            hoverable: true,
            labelMargin: MARGINS.AXES_LABELS
          },
          series: {
            lines: {
              show: true,
              fill: true,
              fillColor: COLORS.AREA_FILL
            }
          },
          yaxis: {
            tickLength: 0
          }
        };

        $scope.$watch('thresholdPreviewChart.series', (series) => {
          this.data = [ series ];

          const timeBuckets = new TimeBuckets();
          timeBuckets.setBounds({
            min: this.startDate,
            max: this.endDate
          });
          const momentFormat = timeBuckets.getScaledDateFormat();

          const options = {
            xaxis: {
              mode: 'time',
              min: this.startDate,
              max: this.endDate,
              tickFormatter: (val) => moment(val).format(momentFormat)
            }
          };

          this.updateOptions(options);
        });

        $scope.$watch('thresholdPreviewChart.thresholdValue', (thresholdValue) => {
          const parsedThreshold = Number.parseFloat(thresholdValue);

          const options = {
            grid: {
              markings: []
            }
          };

          if (isNumber(parsedThreshold)) {
            const thresholdLine = {
              yaxis: {
                from: parsedThreshold,
                to: parsedThreshold
              },
              color: COLORS.THRESHOLD_LINE,
              lineWidth: LINE_WIDTHS.THRESHOLD_LINE
            };

            options.grid.markings.push(thresholdLine);
          }

          this.updateOptions(options);
        });
      }

      updateOptions = (options) => {
        const yAxisRange = this.buildYAxisRange();
        this.options = merge({}, this.options, options, yAxisRange);
      }

      buildYAxisRange = () => {
        const parsedThreshold = Number.parseFloat(this.thresholdValue);
        const series = this.data[0];

        if (!series || !isNumber(parsedThreshold)) {
          return {
            yaxis: {
              min: null,
              max: null
            }
          };
        }

        const VALUE_INDEX = 1;
        const options = {
          yaxis: {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
          }
        };

        forEach(series, seriesItem => {
          const itemValue = seriesItem[VALUE_INDEX];

          if (itemValue !== null) {
            options.yaxis.min = Math.min(options.yaxis.min, itemValue, parsedThreshold);
            options.yaxis.max = Math.max(options.yaxis.max, itemValue, parsedThreshold);
          }
        });

        return options;
      }

      onPlotHover = (event, pos, item, plot) => {
        if (!Boolean(item)) {
          this.dataPointTooltip = undefined;
          return;
        }

        const plotLeft = plot.offset().left - window.pageXOffset;
        const plotTop = plot.offset().top - window.pageYOffset;

        this.dataPointTooltip = {
          plotPosition: {
            left: plotLeft,
            top: plotTop,
            right: plotLeft + plot.width(),
            bottom: plotTop + plot.height()
          },
          pointPosition: {
            left: item.pageX - window.pageXOffset,
            top: item.pageY - window.pageYOffset
          },
          xValue: item.datapoint[0],
          yValue: item.datapoint[1]
        };
      }

      get isDataExists() {
        return Boolean(this.series);
      }

      formatAsMoment = (msSinceEpoch) => {
        return moment(msSinceEpoch);
      }
    }
  };
});
