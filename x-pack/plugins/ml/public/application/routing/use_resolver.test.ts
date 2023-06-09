/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useMlKibana, useMlLicenseInfo } from '../contexts/kibana';
import { useRouteResolver } from './use_resolver';
import { MlLicenseInfo } from '../../../common/license/ml_license';

jest.mock('../contexts/kibana');
jest.mock('../capabilities/check_capabilities');

describe('useResolver', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to the home page if ML is disabled', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: false,
    });
    const { waitForNextUpdate } = renderHook(() => useRouteResolver('full', ['canCreateJob']));
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('home');
  });

  it('should redirect to the home page if license is not sufficient', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: true,
      isMinimumLicense: false,
    });
    const { waitForNextUpdate } = renderHook(() => useRouteResolver('full', ['canCreateJob']));
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('home');
  });

  it('should redirect to the data viz page if license is not full', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: true,
      isMinimumLicense: true,
      isFullLicense: false,
    });
    const { waitForNextUpdate } = renderHook(() => useRouteResolver('full', ['canCreateJob']));
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('ml', {
      path: 'datavisualizer',
    });
  });
});
