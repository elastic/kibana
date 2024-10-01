/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspFinding, CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common';
import { getVendorName } from './get_vendor_name';

describe('getVendorName', () => {
  it('should return the vendor from the finding if available', () => {
    const finding: CspFinding = {
      observer: { vendor: 'SomeVendor' },
      data_stream: { dataset: 'some.dataset' },
    };

    const result = getVendorName(finding);
    expect(result).toBe('SomeVendor');
  });

  it('should return "Wiz" for Wiz misconfiguration dataset', () => {
    const finding: CspFinding = {
      observer: {},
      data_stream: { dataset: 'wiz.cloud_configuration_finding' },
    };

    const result = getVendorName(finding);
    expect(result).toBe('Wiz');
  });

  it('should return "Wiz" for Wiz vulnerability dataset', () => {
    const finding: CspVulnerabilityFinding = {
      observer: {},
      data_stream: { dataset: 'wiz.vulnerability' },
    };

    const result = getVendorName(finding);
    expect(result).toBe('Wiz');
  });

  it('should return "Elastic" for Elastic misconfiguration dataset', () => {
    const finding: CspFinding = {
      observer: {},
      data_stream: { dataset: 'cloud_security_posture.findings' },
    };

    const result = getVendorName(finding);
    expect(result).toBe('Elastic');
  });

  it('should return "Elastic" for Elastic vulnerability dataset', () => {
    const finding: CspVulnerabilityFinding = {
      observer: {},
      data_stream: { dataset: 'cloud_security_posture.vulnerabilities' },
    };

    const result = getVendorName(finding);
    expect(result).toBe('Elastic');
  });

  it('should return undefined if no vendor or known dataset is provided', () => {
    const finding: CspFinding = {
      observer: {},
      data_stream: { dataset: 'unknown.dataset' },
    };

    const result = getVendorName(finding);
    expect(result).toBeUndefined();
  });
});
