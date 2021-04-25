/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SettingsChecker } from './settings_checker';

export class NodeSettingsChecker extends SettingsChecker {
  constructor(params) {
    super(params);

    this.setApi('../api/monitoring/v1/elasticsearch_settings/check/nodes');
    this.setMessage('Checking nodes settings API on production cluster');
  }
}
