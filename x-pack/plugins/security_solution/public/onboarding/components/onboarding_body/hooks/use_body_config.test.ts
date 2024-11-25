/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useBodyConfig } from './use_body_config';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import useObservable from 'react-use/lib/useObservable';
import { hasCapabilities } from '../../../../common/lib/capabilities';

const bodyConfig = [
  {
    title: 'Group 1',
    cards: [
      {
        id: 'license_card',
        title: 'licensed card',
        icon: 'fleetApp',
        licenseType: 'platinum',
      },
      {
        id: 'capabilities_card',
        title: 'rbac card',
        icon: 'fleetApp',
        capabilities: ['siem.crud'],
      },
    ],
  },
  {
    title: 'Group 2',
    cards: [
      {
        id: 'capabilities_license_card',
        title: 'all card',
        icon: 'fleetApp',
        capabilities: ['siem.crud'],
        licenseType: 'platinum',
      },
    ],
  },
];

// Mock dependencies
jest.mock('react-use/lib/useObservable');
jest.mock('../../../../common/lib/kibana/kibana_react');
jest.mock('../../../../common/lib/capabilities');
jest.mock('../body_config', () => ({ bodyConfig }));

const mockLicenseHasAtLeast = jest.fn();
const mockUseObservable = useObservable as jest.Mock;
const mockHasCapabilities = hasCapabilities as jest.Mock;
mockUseObservable.mockReturnValue({ hasAtLeast: mockLicenseHasAtLeast });

(useKibana as jest.Mock).mockReturnValue({
  services: { application: { capabilities: {} }, licensing: {} },
});

describe('useBodyConfig', () => {
  beforeEach(() => {
    mockLicenseHasAtLeast.mockReturnValue(true);
    mockHasCapabilities.mockReturnValue(true);
    jest.clearAllMocks();
  });

  it('should return an empty array if license is not defined', () => {
    mockUseObservable.mockReturnValueOnce(undefined);
    const { result } = renderHook(useBodyConfig);
    expect(result.current).toEqual([]);
  });

  it('should return all cards if no capabilities or licenseType are filtered', () => {
    const { result } = renderHook(useBodyConfig);
    expect(result.current).toEqual(bodyConfig);
  });

  it('should filter out cards based on license', () => {
    mockLicenseHasAtLeast.mockReturnValue(false);

    const { result } = renderHook(useBodyConfig);

    expect(result.current).toEqual([
      {
        title: 'Group 1',
        cards: [
          {
            id: 'capabilities_card',
            title: 'rbac card',
            icon: 'fleetApp',
            capabilities: ['siem.crud'],
          },
        ],
      },
    ]);
  });

  it('should filter out cards based on capabilities', () => {
    mockHasCapabilities.mockReturnValue(false);

    const { result } = renderHook(useBodyConfig);

    expect(result.current).toEqual([
      {
        title: 'Group 1',
        cards: [
          {
            id: 'license_card',
            title: 'licensed card',
            icon: 'fleetApp',
            licenseType: 'platinum',
          },
        ],
      },
    ]);
  });
});
