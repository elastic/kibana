/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspFinding, CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common';
import { isNativeCspFinding } from './is_native_csp_finding';

export const CSP_MISCONFIGURATIONS_DATASET = 'cloud_security_posture.findings';
export const CSP_VULN_DATASET = 'cloud_security_posture.vulnerabilities';
export const WIZ_MISCONFIGURATIONS_DATASET = 'wiz.cloud_configuration_finding';
export const WIZ_VULN_DATASET = 'wiz.vulnerability';

export const getVendorName = (finding: CspFinding | CspVulnerabilityFinding) => {
  if (finding.observer?.vendor) return finding.observer.vendor;

  const dataset = finding.data_stream?.dataset;

  if (dataset === WIZ_MISCONFIGURATIONS_DATASET || dataset === WIZ_VULN_DATASET) return 'Wiz';
  if (isNativeCspFinding(finding)) return 'Elastic';
};
