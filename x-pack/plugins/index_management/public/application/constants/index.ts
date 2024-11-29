/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const REACT_ROOT_ID = 'indexManagementReactRoot';

export const ENRICH_POLICIES_REQUIRED_PRIVILEGES = ['manage_enrich'];

// Based on https://github.com/elastic/elasticsearch/blob/5935f766df80325f748c3193e13e6e74fb5c1f37/modules/kibana/src/main/java/org/elasticsearch/kibana/KibanaPlugin.java#L25-L53
const KIBANA_INDEX_DESCRIPTOR = '.kibana_';
const REPORTING_INDEX_DESCRIPTO = '.reporting-';
const APM_AGENT_CONFIG_INDEX_DESCRIPTOR = '.apm-agent-configuration';
const APM_CUSTOM_LINK_INDEX_DESCRIPTOR = '.apm-custom-link';

export const SYSTEM_INDEX_PREFIX = [
  KIBANA_INDEX_DESCRIPTOR,
  REPORTING_INDEX_DESCRIPTO,
  APM_AGENT_CONFIG_INDEX_DESCRIPTOR,
  APM_CUSTOM_LINK_INDEX_DESCRIPTOR,
];

export * from './ilm_locator';
