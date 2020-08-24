/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SuricataEcs {
  eve?: SuricataEveData;
}

export interface SuricataEveData {
  alert?: SuricataAlertData;

  flow_id?: number[];

  proto?: string[];
}

export interface SuricataAlertData {
  signature?: string[];

  signature_id?: number[];
}
