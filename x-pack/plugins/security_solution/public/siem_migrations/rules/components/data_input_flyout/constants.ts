/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DataInputStep {
  rules = 'rules',
  macros = 'macros',
  lookups = 'lookups',
}

export const SPL_RULES_COLUMNS = [
  'id',
  'title',
  'search',
  'description',
  'action.escu.eli5',
  'action.correlationsearch.annotations',
] as const;

export const RULES_SPL_QUERY = `| rest splunk_server=local /servicesNS/-/-/saved/searches
| search action.correlationsearch.enabled = "1" OR (eai:acl.app = "Splunk_Security_Essentials" AND is_scheduled=1)
| where disabled=0
| table ${SPL_RULES_COLUMNS.join(', ')}`;
