/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useMlKibana, useMlLicenseInfo } from '../contexts/kibana';
import { useRouteResolver } from './use_resolver';
import { MlLicenseInfo } from '../../../common/license/ml_license';

jest.mock('../contexts/kibana');
jest.mock('../capabilities/check_capabilities');

describe('useResolver', () => {
  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });
  afterEach(() => {
    jest.advanceTimersByTime(0);
    jest.useRealTimers();
  });

  it('should redirect to home page if ML is disabled', async () => {
    (useMlLicenseInfo as jest.Mock<Partial<MlLicenseInfo>>).mockReturnValueOnce({
      isMlEnabled: false,
    });

    renderHook(() => useRouteResolver('full', ['canCreateJob']));

    expect(useMlKibana().services.application.navigateToApp).toHaveBeenCalledWith('home');
  });
});
