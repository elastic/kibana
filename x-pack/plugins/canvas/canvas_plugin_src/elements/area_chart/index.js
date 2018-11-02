/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const areaChart = () => {
  return {
    name: 'areaChart',
    displayName: 'Area chart',
    help: 'A line chart with a filled body',
    image: require('./header.png'),
    expression: `filters
  | demodata
  | pointseries x="time" y="mean(price)"
  | plot defaultStyle={seriesStyle lines=1 fill=1}
  | render`,
  };
};
