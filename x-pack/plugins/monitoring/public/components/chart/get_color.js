/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Get the color to use for line of the chart.
 * No chart uses more than 3 colors, but this method has a safety catch to
 * return black if the `index` param is outside of the normal range.
 *
 * @param {String} app: 'elasticsearch', 'kibana', etc
 * @param {Integer} index: index of the chart series, 0-3
 * @returns {String} Hex color to use for chart series at the given index
 */
export function getColor(app, index) {
  let seriesColors;
  if (app === 'elasticsearch') {
    seriesColors = ['#3ebeb0', '#3b73ac', '#f08656', '#6c478f'];
  } else if (app === 'apm') {
    // From https://github.com/elastic/elastic-charts/blob/master/src/utils/themes/colors.ts
    seriesColors = [
      '#1EA593',
      '#2B70F7',
      '#CE0060',
      '#38007E',
      '#FCA5D3',
      '#F37020',
      '#E49E29',
      '#B0916F',
      '#7B000B',
      '#34130C',
      '#A5E26A',
      '#D2E26A',
      '#EBDF61',
    ];
  } else {
    // for kibana, and fallback (e.g., Logstash and Beats)
    seriesColors = ['#e8488b', '#3b73ac', '#3cab63', '#6c478f'];
  }

  if (seriesColors[index]) {
    return seriesColors[index];
  }

  return '#000';
}
