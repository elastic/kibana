/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import d3 from 'd3';
import { calculateTextWidth } from 'plugins/ml/util/string_utils';
import moment from 'moment';

const MAX_LABEL_WIDTH = 100;

export function chartLimits(data = []) {
  const limits = { max: 0, min: 0 };

  limits.max = d3.max(data, (d) => d.value);
  limits.min = d3.min(data, (d) => d.value);
  if (limits.max === limits.min) {
    limits.max = d3.max(data, (d) => {
      if (d.typical) {
        return Math.max(d.value, d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
    limits.min = d3.min(data, (d) => {
      if (d.typical) {
        return Math.min(d.value, d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
  }

  // add padding of 5% of the difference between max and min
  // if we ended up with the same value for both of them
  if (limits.max === limits.min) {
    const padding = limits.max * 0.05;
    limits.max += padding;
    limits.min -= padding;
  }

  return limits;
}

export function drawLineChartDots(data, lineChartGroup, lineChartValuesLine, radius = 1.5) {
  // We need to do this because when creating a line for a chart which has data gaps,
  // if there are single datapoints without any valid data before and after them,
  // the lines created by using d3...defined() do not contain these data points.
  // So this function adds additional circle elements to display the single
  // datapoints in additional to the line created for the chart.

  // first reduce the dataset to data points
  // where the previous and next one don't contain any data
  const dotsData = data.reduce((p, c, i) => {
    const previous = data[i - 1];
    const next = data[i + 1];
    if (
      (typeof previous === 'undefined' || (previous && previous.value === null)) &&
      c.value !== null &&
      (typeof next === 'undefined' || (next && next.value === null))
    ) {
      p.push(c);
    }
    return p;
  }, []);

  // check if `g.values-dots` already exists, if not create it
  // in both cases assign the element to `dotGroup`
  const dotGroup = (lineChartGroup.select('.values-dots').empty())
    ? lineChartGroup.append('g').classed('values-dots', true)
    : lineChartGroup.select('.values-dots');

  // use d3's enter/update/exit pattern to render the dots
  const dots = dotGroup.selectAll('circle').data(dotsData);

  dots.enter().append('circle')
    .attr('r', radius);

  dots
    .attr('cx', lineChartValuesLine.x())
    .attr('cy', lineChartValuesLine.y());

  dots.exit().remove();
}

// this replicates Kibana's filterAxisLabels() behavior
// which can be found in ui/vislib/lib/axis/axis_labels.js
// axis labels which overflow the chart's boundaries will be removed
export function filterAxisLabels(selection, chartWidth) {
  if (selection === undefined || selection.selectAll === undefined) {
    throw new Error('Missing selection parameter');
  }

  selection.selectAll('.tick text')
    // don't refactor this to an arrow function because
    // we depend on using `this` here.
    .text(function () {
      const parent = d3.select(this.parentNode);
      const labelWidth = parent.node().getBBox().width;
      const labelXPos = d3.transform(parent.attr('transform')).translate[0];
      const minThreshold = labelXPos - (labelWidth / 2);
      const maxThreshold = labelXPos + (labelWidth / 2);
      if (minThreshold >= 0 && maxThreshold <= chartWidth) {
        return this.textContent;
      } else {
        parent.remove();
      }
    });
}

export function numTicks(axisWidth) {
  return axisWidth / MAX_LABEL_WIDTH;
}

export function numTicksForDateFormat(axisWidth, dateFormat) {
  // Allow 1.75 times the width of a formatted date per tick for padding.
  const tickWidth = calculateTextWidth(moment().format(dateFormat), false);
  return axisWidth / (1.75 * tickWidth);
}
