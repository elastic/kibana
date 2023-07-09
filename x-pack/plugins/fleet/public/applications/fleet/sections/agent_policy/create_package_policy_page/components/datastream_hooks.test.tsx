/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { usePackagePolicyEditorPageUrl } from './datastream_hooks';

const mockedUseParams = useParams as jest.MockedFunction<typeof useParams>;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

describe('usePackagePolicyEditorPageUrl', () => {
  it('should render an integration url if no policy id is provided', () => {
    const renderer = createFleetTestRendererMock();
    mockedUseParams.mockReturnValue({
      packagePolicyId: 'test-package-policy-id',
    } as any);
    const { result } = renderer.renderHook(() => usePackagePolicyEditorPageUrl());
    expect(result.current).toBe('/mock/app/integrations/edit-integration/test-package-policy-id');
  });

  it('should render a fleet url if a policy id is provided', () => {
    const renderer = createFleetTestRendererMock();
    mockedUseParams.mockReturnValue({
      policyId: 'policy1',
      packagePolicyId: 'test-package-policy-id',
    } as any);
    const { result } = renderer.renderHook(() => usePackagePolicyEditorPageUrl());
    expect(result.current).toBe(
      '/mock/app/fleet/policies/policy1/edit-integration/test-package-policy-id'
    );
  });

  it('should add datastream Id if provided', () => {
    const renderer = createFleetTestRendererMock();
    mockedUseParams.mockReturnValue({
      policyId: 'policy1',
      packagePolicyId: 'test-package-policy-id',
    } as any);
    const { result } = renderer.renderHook(() =>
      usePackagePolicyEditorPageUrl('test-datastream-id')
    );
    expect(result.current).toBe(
      '/mock/app/fleet/policies/policy1/edit-integration/test-package-policy-id?datastreamId=test-datastream-id'
    );
  });
});
