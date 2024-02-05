/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useLicense } from '../../../../hooks/use_license';
import { useAppUrl } from '../../../../lib/kibana';
import { CurrentPlan } from './current_plan';
import type { LicenseService } from '../../../../../../common/license';

jest.mock('../../../../hooks/use_license');
jest.mock('../../../../lib/kibana');

const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseAppUrl = useAppUrl as jest.MockedFunction<typeof useAppUrl>;
const mockManagementUrl = 'https://management';
const mockProjectFeaturesUrl = 'https://projectFeatures';

describe('CurrentPlan', () => {
  beforeEach(() => {
    mockUseAppUrl.mockReturnValue({
      getAppUrl: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing if license is enterprise', () => {
    mockUseLicense.mockReturnValue({
      getLicenseType: jest.fn().mockReturnValue('enterprise'),
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    const { container } = render(
      <CurrentPlan productTier={undefined} projectFeaturesUrl={undefined} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders nothing if license type is enterprise', () => {
    mockUseLicense.mockReturnValue({
      getLicenseType: jest.fn().mockReturnValue('enterprise'),
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    const { container } = render(
      <CurrentPlan productTier={undefined} projectFeaturesUrl={mockProjectFeaturesUrl} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders component with valid productTier and projectFeaturesUrl', () => {
    mockUseLicense.mockReturnValue({
      getLicenseType: jest.fn().mockReturnValue('basic'),
      isEnterprise: jest.fn().mockReturnValue(false),
    } as unknown as LicenseService);

    mockUseAppUrl.mockReturnValue({
      getAppUrl: jest.fn().mockReturnValue(mockManagementUrl),
    });

    const { getByTestId } = render(
      <CurrentPlan productTier="gold" projectFeaturesUrl={mockProjectFeaturesUrl} />
    );

    expect(getByTestId('currentPlanLabel')).toHaveTextContent('Current tier:');
    expect(getByTestId('currentPlanLink').getAttribute('href')).toEqual(mockProjectFeaturesUrl);
  });

  test('renders component without productTier and projectFeaturesUrl', () => {
    mockUseLicense.mockReturnValue({
      getLicenseType: jest.fn().mockReturnValue('basic'),
      isEnterprise: jest.fn().mockReturnValue(false),
    } as unknown as LicenseService);

    mockUseAppUrl.mockReturnValue({
      getAppUrl: jest.fn().mockReturnValue(mockManagementUrl),
    });

    const { getByTestId } = render(
      <CurrentPlan productTier={undefined} projectFeaturesUrl={undefined} />
    );

    expect(getByTestId('currentPlanLabel')).toHaveTextContent('Current plan:');
    expect(getByTestId('currentPlanLink').getAttribute('href')).toEqual(mockManagementUrl);
  });
});
