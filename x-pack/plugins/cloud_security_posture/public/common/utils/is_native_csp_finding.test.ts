/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CSP_MISCONFIGURATIONS_DATASET, CSP_VULN_DATASET } from './get_vendor_name';
import { isNativeCspFinding } from './is_native_csp_finding';
import { CspFinding } from '@kbn/cloud-security-posture-common';
import { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/csp_vulnerability_finding';

describe('isNativeCspFinding', () => {
  it("should return true when finding's dataset matches CSP_MISCONFIGURATIONS_DATASET", () => {
    const finding = {
      data_stream: {
        dataset: CSP_MISCONFIGURATIONS_DATASET,
      },
    } as CspFinding;

    expect(isNativeCspFinding(finding)).toBe(true);
  });

  it("should return true when finding's dataset matches CSP_VULN_DATASET", () => {
    const finding = {
      data_stream: {
        dataset: CSP_VULN_DATASET,
      },
    } as CspVulnerabilityFinding;

    expect(isNativeCspFinding(finding)).toBe(true);
  });

  it('should return false when finding object is missing data_stream property', () => {
    const finding = {} as CspFinding;

    expect(isNativeCspFinding(finding)).toBe(false);
  });

  it('should return false when finding object has data_stream property but missing dataset property', () => {
    const finding = {
      data_stream: {},
    } as CspFinding;

    expect(isNativeCspFinding(finding)).toBe(false);
  });

  it('should return false when dataset property is null or undefined', () => {
    const findingWithUndefinedDataset = {
      data_stream: {
        dataset: undefined,
      },
    } as CspFinding;

    expect(isNativeCspFinding(findingWithUndefinedDataset)).toBe(false);
  });
});
