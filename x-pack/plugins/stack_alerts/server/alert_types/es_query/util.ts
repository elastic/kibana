/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryAlertParams } from './alert_type_params';

export function isEsQueryAlert(searchType: EsQueryAlertParams['searchType']) {
  return searchType !== 'searchSource';
}
