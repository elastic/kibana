/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SettingsChecker } from './settings_checker';

export class ClusterSettingsChecker extends SettingsChecker {
  constructor(params) {
    super(params);

    this.setApi('../api/monitoring/v1/elasticsearch_settings/check/cluster');
    this.setMessage('Checking cluster settings API on production cluster');
  }
}
