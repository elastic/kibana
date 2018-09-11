/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import d3 from 'd3';
import { calculateTextWidth } from '../util/string_utils';
import moment from 'moment';
import rison from 'rison-node';

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';

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

export function getExploreSeriesLink(series) {
  // Open the Single Metric dashboard over the same overall bounds and
  // zoomed in to the same time as the current chart.
  const bounds = timefilter.getActiveBounds();
  const from = bounds.min.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
  const to = bounds.max.toISOString();

  const zoomFrom = moment(series.plotEarliest).toISOString();
  const zoomTo = moment(series.plotLatest).toISOString();

  // Pass the detector index and entity fields (i.e. by, over, partition fields)
  // to identify the particular series to view.
  // Initially pass them in the mlTimeSeriesExplorer part of the AppState.
  // TODO - do we want to pass the entities via the filter?
  const entityCondition = {};
  series.entityFields.forEach((entity) => {
    entityCondition[entity.fieldName] = entity.fieldValue;
  });

  // Use rison to build the URL .
  const _g = rison.encode({
    ml: {
      jobIds: [series.jobId]
    },
    refreshInterval: {
      display: 'Off',
      pause: false,
      value: 0
    },
    time: {
      from: from,
      to: to,
      mode: 'absolute'
    }
  });

  const _a = rison.encode({
    mlTimeSeriesExplorer: {
      zoom: {
        from: zoomFrom,
        to: zoomTo
      },
      detectorIndex: series.detectorIndex,
      entities: entityCondition,
    },
    filters: [],
    query: {
      query_string: {
        analyze_wildcard: true,
        query: '*'
      }
    }
  });

  return `${chrome.getBasePath()}/app/ml#/timeseriesexplorer?_g=${_g}&_a=${encodeURIComponent(_a)}`;
}

export function numTicks(axisWidth) {
  return axisWidth / MAX_LABEL_WIDTH;
}

export function numTicksForDateFormat(axisWidth, dateFormat) {
  // Allow 1.75 times the width of a formatted date per tick for padding.
  const tickWidth = calculateTextWidth(moment().format(dateFormat), false);
  return axisWidth / (1.75 * tickWidth);
}

// Based on a fixed starting timestamp and an interval, get tick values within
// the bounds of earliest and latest. This is useful for the Anomaly Explorer Charts
// to align axis ticks with the gray area resembling the swimlane cell selection.
export function getTickValues(startTs, tickInterval, earliest, latest) {
  const tickValues = [];

  function addTicks(ts, operator) {
    let newTick;
    let addAnotherTick;

    switch (operator) {
      case 'previous':
        newTick = ts - tickInterval;
        addAnotherTick = newTick >= earliest;
        break;
      case 'next':
        newTick = ts + tickInterval;
        addAnotherTick = newTick <= latest;
        break;
    }

    if (addAnotherTick) {
      tickValues.push(newTick);
      addTicks(newTick, operator);
    }
  }

  addTicks(startTs, 'previous');
  addTicks(startTs, 'next');

  tickValues.sort();

  return tickValues;
}
