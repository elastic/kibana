/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGcpIntegrationDetailsFromPackagePolicy } from './get_gcp_integration_details_from_package_policy';

const undefinedAllValue = {
  gcpAccountType: undefined,
  gcpOrganizationId: undefined,
  gcpProjectId: undefined,
};

describe('getGcpIntegrationDetailsFromPackagePolicy', () => {
  test('returns undefined when packagePolicy is undefined', () => {
    const result = getGcpIntegrationDetailsFromPackagePolicy(undefined);
    expect(result).toEqual(undefinedAllValue);
  });

  test('returns undefined when packagePolicy is defined but inputs are empty', () => {
    const packagePolicy = { inputs: [] };
    // @ts-expect-error
    const result = getGcpIntegrationDetailsFromPackagePolicy(packagePolicy);
    expect(result).toEqual(undefinedAllValue);
  });

  it('should return undefined when no input has enabled and gcp integration details', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, streams: [{}] },
        { enabled: true, streams: [{ vars: { other_property: 'false' } }] },
        { enabled: true, streams: [{ other_property: 'False' }] },
      ],
    };
    // @ts-expect-error
    const result = getGcpIntegrationDetailsFromPackagePolicy(packagePolicy);
    expect(result).toEqual(undefinedAllValue);
  });

  it('should return the first gcp integration details when available', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, streams: [{}] },
        {
          enabled: true,
          streams: [
            {
              vars: {
                'gcp.account_type': { value: 'account_type_test_1' },
                'gcp.project_id': { value: 'project_id_1' },
                'gcp.organization_id': { value: 'organization_id_1' },
              },
            },
          ],
        },
        {
          enabled: true,
          streams: [
            {
              vars: {
                'gcp.account_type': { value: 'account_type_test_2' },
                'gcp.project_id': { value: 'project_id_2' },
                'gcp.organization_id': { value: 'organization_id_2' },
              },
            },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getGcpIntegrationDetailsFromPackagePolicy(packagePolicy);
    expect(result).toEqual({
      gcpAccountType: 'account_type_test_1',
      gcpOrganizationId: 'organization_id_1',
      gcpProjectId: 'project_id_1',
    });
  });
  // Add more test cases as needed
});
