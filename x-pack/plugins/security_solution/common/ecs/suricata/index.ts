/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
