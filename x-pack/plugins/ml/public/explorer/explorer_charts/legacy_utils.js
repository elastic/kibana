/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';

export function getChartContainerWidth() {
  const $chartContainer = $('.explorer-charts');
  return Math.floor($chartContainer.width());
}
