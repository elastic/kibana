/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type {
  UseInvestigationGuideParams,
  UseInvestigationGuideResult,
} from './use_investigation_guide';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_data_formatted_for_field_browser';
import { useInvestigationGuide } from './use_investigation_guide';

jest.mock('../../../../timelines/components/side_panel/event_details/helpers');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;

describe('useInvestigationGuide', () => {
  let hookResult: RenderHookResult<UseInvestigationGuideParams, UseInvestigationGuideResult>;

  it('should return loading true', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ ruleId: 'ruleId' });
    (useRuleWithFallback as jest.Mock).mockReturnValue({ loading: true });

    hookResult = renderHook(() => useInvestigationGuide({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toBeTruthy();
  });

  it('should return error true', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ ruleId: 'ruleId' });
    (useRuleWithFallback as jest.Mock).mockReturnValue({ error: true });

    hookResult = renderHook(() => useInvestigationGuide({ dataFormattedForFieldBrowser }));
  });

  it('should return basicAlertData and ruleNote', () => {
    (useBasicDataFromDetailsData as jest.Mock).mockReturnValue({ ruleId: 'ruleId' });
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertsData: { ruleId: 'ruleId' },
      rule: { note: 'test note' },
    });

    hookResult = renderHook(() => useInvestigationGuide({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toBeFalsy();
    expect(hookResult.result.current.error).toBeFalsy();
    expect(hookResult.result.current.basicAlertData).toEqual({ ruleId: 'ruleId' });
    expect(hookResult.result.current.ruleNote).toEqual('test note');
  });
});
