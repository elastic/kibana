/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { UseShowRelatedAlertsByAncestryParams } from './use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { licenseService } from '../../../common/hooks/use_license';
import { mockDataAsNestedObject } from '../mocks/mock_context';

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

const agentType = {
  category: 'agent',
  field: 'agent.type',
  isObjectArray: false,
  originalValue: ['endpoint'],
  values: ['endpoint'],
};
const eventModule = {
  category: 'event',
  field: 'event.module',
  isObjectArray: false,
  originalValue: ['abc'],
  values: ['abc'],
};
const processEntityId = {
  category: 'process',
  field: 'process.entity_id',
  isObjectArray: false,
  originalValue: ['abc'],
  values: ['abc'],
};
const alertAncestorId = {
  category: 'kibana',
  field: 'kibana.alert.ancestors.id',
  isObjectArray: false,
  originalValue: ['abc'],
  values: ['abc'],
};
const ruleParameterIndex = {
  category: 'kibana',
  field: 'kibana.alert.rule.parameters.index',
  isObjectArray: false,
  originalValue: ['abc'],
  values: ['abc'],
};

describe('useShowRelatedAlertsBySameSourceEvent', () => {
  let hookResult: RenderHookResult<UseShowRelatedAlertsByAncestryParams, boolean>;

  it('should return false if dataFormattedForFieldBrowser is null', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser = null;
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it(`should return false if feature isn't enabled`, () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      agentType,
      eventModule,
      processEntityId,
      alertAncestorId,
      ruleParameterIndex,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing kibana.alert.ancestors.id field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      agentType,
      eventModule,
      processEntityId,
      ruleParameterIndex,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing kibana.alert.rule.parameters.index field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      agentType,
      eventModule,
      processEntityId,
      alertAncestorId,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing process.entity_id field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      agentType,
      eventModule,
      alertAncestorId,
      ruleParameterIndex,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing event.module field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      {
        category: 'agent',
        field: 'agent.type',
        isObjectArray: false,
        originalValue: ['winlogbeat'],
        values: ['winlogbeat'],
      },
      processEntityId,
      alertAncestorId,
      ruleParameterIndex,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing agent.type field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      eventModule,
      processEntityId,
      alertAncestorId,
      ruleParameterIndex,
    ];
    hookResult = renderHook(() =>
      useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser, dataAsNestedObject })
    );

    expect(hookResult.result.current).toEqual(false);
  });
});
