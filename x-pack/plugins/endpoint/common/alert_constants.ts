/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class AlertConstants {
  /**
   * The prefix for all Alert APIs
   */
  static BASE_API_URL = '/api/endpoint';
  /**
   * The path for the Alert's Index Pattern API.
   */
  static INDEX_PATTERN_ROUTE = `${AlertConstants.BASE_API_URL}/index_pattern`;
  /**
   * Alert's Index pattern
   */
  static ALERT_INDEX_NAME = 'events-endpoint-1';
  /**
   * A paramter passed to Alert's Index Pattern.
   */
  static EVENT_DATASET = 'events';
  /**
   * Alert's Search API default page size
   */
  static DEFAULT_TOTAL_HITS = 10000;
  /**
   * Alerts
   **/
  static ALERT_LIST_DEFAULT_PAGE_SIZE = 10;
  static ALERT_LIST_DEFAULT_SORT = '@timestamp';
  static MAX_LONG_INT = '9223372036854775807'; // 2^63-1
}
