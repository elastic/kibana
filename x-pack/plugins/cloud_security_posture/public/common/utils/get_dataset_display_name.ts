/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Dataset = 'wiz.cloud_configuration_finding' | 'cloud_security_posture.findings';

export const CSP_MISCONFIGURATIONS_DATASET = 'cloud_security_posture.findings';
export const CSP_VULN_DATASET = 'cloud_security_posture.vulnerabilities';
export const WIZ_MISCONFIGURATIONS_DATASET = 'wiz.cloud_configuration_finding';
export const WIZ_VULN_DATASET = 'wiz.vulnerability';

export const getDatasetDisplayName = (dataset?: Dataset | string) => {
  if (dataset === WIZ_MISCONFIGURATIONS_DATASET || dataset === WIZ_VULN_DATASET) return 'Wiz';
  if (dataset === CSP_MISCONFIGURATIONS_DATASET || dataset === CSP_VULN_DATASET)
    return 'Elastic CSP';
};
