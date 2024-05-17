/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GLOBAL_DATA_TAG_EXCLUDED_INPUTS = new Set<string>([
  'apm',
  'pf-host-agent',
  'pf-elastic-symbolizer',
  'pf-elastic-collector',
  'fleet-server',
  'cloud-defend',
  // all of the cloudbeat inputs are exclude
  // https://github.com/elastic/elastic-agent/blob/main/specs/cloudbeat.spec.yml
  'cloudbeat',
  'cloudbeat/cis_k8s',
  'cloudbeat/cis_eks',
  'cloudbeat/cis_aws',
  'cloudbeat/cis_gcp',
  'cloudbeat/cis_azure',
  'cloudbeat/vuln_mgmt_aws',
]);
