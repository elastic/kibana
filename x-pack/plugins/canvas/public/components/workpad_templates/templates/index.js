/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ecommerceRevenueTracking = require('./ecommerce_revenue_tracking.json');
const flightsOverview = require('./flights_overview.json');
const logsWebTraffic = require('./logs_web_traffic.json');
const themeDark = require('./theme_dark.json');
const themeLight = require('./theme_light.json');

export const templates = [
  ecommerceRevenueTracking,
  flightsOverview,
  logsWebTraffic,
  themeDark,
  themeLight,
];
