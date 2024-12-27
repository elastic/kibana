/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGSTASH_DEFAULT_START_TIME = '2015-09-19T06:31:44.000Z';
export const LOGSTASH_DEFAULT_END_TIME = '2015-09-23T18:31:44.000Z';

export const DATA_VIEW_ID = {
  ECOMMERCE: '5193f870-d861-11e9-a311-0fa548c5f953',
  LOGSTASH: 'logstash-*',
};

export const DATA_VIEW = {
  ECOMMERCE: 'ecommerce',
  LOGSTASH: 'logstash-*',
};

export const LOGSTASH_OUT_OF_RANGE_DATES = {
  from: 'Mar 1, 2020 @ 00:00:00.000',
  to: 'Nov 1, 2020 @ 00:00:00.000',
};

export const LOGSTASH_IN_RANGE_DATES = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

export const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/test/functional/es_archives/logstash_functional',
  NO_TIME_FIELD: 'test/functional/fixtures/es_archiver/index_pattern_without_timefield',
  ECOMMERCE: 'x-pack/test/functional/es_archives/reporting/ecommerce',
};

export const KBN_ARCHIVES = {
  INVALID_SCRIPTED_FIELD: 'test/functional/fixtures/kbn_archiver/invalid_scripted_field',
  NO_TIME_FIELD: 'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield',
  DASHBOARD_DRILLDOWNS:
    'x-pack/test/functional/fixtures/kbn_archiver/dashboard_drilldowns/drilldowns',
  DISCOVER: 'test/functional/fixtures/kbn_archiver/discover',
  ECOMMERCE: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json',
};
