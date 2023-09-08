/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type {
  UseShowRelatedAlertsByAncestryParams,
  UseShowRelatedAlertsByAncestryResult,
} from './use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { licenseService } from '../../../common/hooks/use_license';
import { mockDataAsNestedObject, mockDataFormattedForFieldBrowser } from '../mocks/mock_context';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});
const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

const dataAsNestedObject = mockDataAsNestedObject as unknown as Ecs;
const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

describe('useShowRelatedAlertsByAncestry', () => {
  let hookResult: RenderHookResult<
    UseShowRelatedAlertsByAncestryParams,
    UseShowRelatedAlertsByAncestryResult
  >;

  it('should return false if getFieldsData returns null', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => null;
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
      })
    );

    expect(hookResult.result.current).toEqual({ show: false, indices: ['rule-parameters-index'] });
  });

  it(`should return false if feature isn't enabled`, () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => 'value';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      documentId: 'value',
      indices: ['rule-parameters-index'],
    });
  });

  it(`should return false if license is lower than platinum`, () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    const getFieldsData = () => 'value';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: false,
      documentId: 'value',
      indices: ['rule-parameters-index'],
    });
  });

  it('should return true if getFieldsData has the correct fields', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const getFieldsData = () => 'value';
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({
        getFieldsData,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
      })
    );

    expect(hookResult.result.current).toEqual({
      show: true,
      documentId: 'value',
      indices: ['rule-parameters-index'],
    });
  });
});
