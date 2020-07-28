/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';
import { get } from 'lodash';

/*
  FreeBSD-License
*/
const options = {
  numbers: {},
};

const xAlign = function (x) {
  return x;
};
const yAlign = function (y) {
  return y;
};
//const horizontalShift = 1;

function processOptions(/*plot, options*/) {
  // Nothing
}

function draw(plot, ctx) {
  $('.valueLabel', plot.getPlaceholder()).remove();
  plot.getData().forEach(function (series) {
    const show = get(series.numbers, 'show');
    if (!show) {
      return;
    }

    let points = series.data;

    // TODO: This might only work on single x and y axis charts.
    if (series.stack != null) {
      points = points.map((point, i) => {
        const p = point.slice(0);

        // This magic * 3 and + 1 are due to the way the stacking plugin for flot modifies the series.
        // Note that series.data and series.datapoints.point are different, both in meaning and in format
        // series.data is the original data supplied by the user
        // series.datapoints.point are the calculated points made as result of data processing.
        p[1] = series.datapoints.points[i * 3 + 1];
        return p;
      });
    }

    const offset = plot.getPlotOffset();
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    function writeText(text, x, y) {
      if (typeof text === 'undefined') {
        return;
      }
      const textNode = $('<div/>').text(String(text)).addClass('valueLabel').css({
        position: 'absolute',
      });

      plot.getPlaceholder().append(textNode);

      textNode.css({
        left: x - textNode.width() / 2,
        top: y - textNode.height() / 2,
      });
    }

    for (let i = 0; i < points.length; i++) {
      const point = {
        x: xAlign(points[i][0]),
        y: yAlign(points[i][1]), // Need to calculate here.
      };

      const text = points[i][2].text;
      const c = plot.p2c(point);
      writeText(text, c.left + offset.left, c.top + offset.top + 1);
    }

    ctx.restore();
  });
}

function init(plot) {
  plot.hooks.processOptions.push(processOptions);
  plot.hooks.draw.push(draw);
}

export const text = {
  init: init,
  options: options,
  name: 'text',
  version: '0.1.0',
};
