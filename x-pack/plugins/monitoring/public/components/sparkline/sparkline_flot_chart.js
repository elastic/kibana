/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last, isFunction, debounce } from 'lodash';
import $ from '../../lib/jquery_flot';
import { DEBOUNCE_FAST_MS } from '../../../common/constants';

/**
 * Helper class for operations done by Sparkline component on its flot chart
 */

const flotOptions = {
  grid: {
    // No grid
    show: false,

    margin: 4, // px

    hoverable: true,
  },

  // Set series line color
  colors: ['#3b73ac'], // Cribbed from components/chart/get_color.js

  series: {
    // No shadow on series lines
    shadowSize: 0, // Cribbed from components/chart/get_options.js

    lines: {
      // Set series line width
      lineWidth: 2, // Cribbed from components/chart/get_options.js
    },

    highlightColor: '#3b73ac',

    points: {
      radius: 2,
    },
  },
};

function makeData(series = []) {
  const data = [];

  // The actual series to be rendered
  data.push(series);

  // A fake series, containing only the last point from the actual series, to trick flot
  // into showing the "spark" point of the sparkline.
  data.push({
    data: [last(series)],
    points: {
      show: true,
      radius: 2,
      fill: 1,
      fillColor: false,
    },
  });

  return data;
}

export class SparklineFlotChart {
  constructor(containerElem, initialSeries, onBrush, onHover, overrideOptions) {
    this.containerElem = containerElem;
    this.data = makeData(initialSeries);
    this.options = { ...flotOptions, ...overrideOptions };

    if (isFunction(onBrush)) {
      this.setupBrushHandling(onBrush);
    }

    if (isFunction(onHover)) {
      this.setupHoverHandling(onHover);
    }

    this.render();
    window.addEventListener('resize', this.render);
  }

  render = () => {
    this.flotChart = $.plot(this.containerElem, this.data, this.options);
  };

  update(series) {
    this.flotChart.setData(makeData(series));
    this.flotChart.setupGrid();
    this.flotChart.draw();
  }

  setupBrushHandling = (onBrush) => {
    // Requires `selection` flot plugin
    this.options.selection = {
      mode: 'x',
      color: '#9c9c9c',
    };
    $(this.containerElem).off('plotselected');
    $(this.containerElem).on('plotselected', (_event, range) => {
      onBrush(range);
      this.flotChart.clearSelection();
    });
  };

  setupHoverHandling = (onHover) => {
    const container = $(this.containerElem);
    const debouncedOnHover = debounce(
      (_event, _range, item) => {
        if (item === null) {
          return onHover();
        }

        onHover({
          xValue: item.datapoint[0],
          yValue: item.datapoint[1],
          xPosition: item.pageX - window.pageXOffset,
          yPosition: item.pageY - window.pageYOffset,
          plotTop: container.offset().top,
          plotLeft: container.offset().left,
          plotHeight: container.height(),
          plotWidth: container.width(),
        });
      },
      DEBOUNCE_FAST_MS,
      { leading: true }
    );

    container.off('plothover');
    container.on('plothover', debouncedOnHover);
  };

  /**
   * Necessary to prevent a memory leak. Should be called any time
   * the chart is being removed from the DOM
   */
  shutdown() {
    this.flotChart.shutdown();
    const container = $(this.containerElem);
    container.off('plotselected');
    container.off('plothover');
    window.removeEventListener('resize', this.render);
  }
}
