/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseRuleDetailsLinkParams } from './use_rule_details_link';
import { useRuleDetailsLink } from './use_rule_details_link';

jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: jest
    .fn()
    .mockReturnValue(
      jest
        .fn()
        .mockReturnValue(
          "app/security/rules/id/99eb0638-b2c7-4a1b-bc30-689e25978174?sourcerer=(default:(id:security-solution-default,selectedPatterns:!('logs-*')))&timerange=(global:(linkTo:!(),timerange:(from:'2024-04-22T05:00:00.000Z',fromStr:now%2Fd,kind:absolute,to:'2024-04-23T04:59:59.999Z',toStr:now%2Fd)),timeline:(linkTo:!(),timerange:(from:'2024-04-22T21:02:05.427Z',kind:absolute,to:'2024-04-22T21:08:05.427Z')))&timeline=(activeTab:query,graphEventId:'',isOpen:!t)"
        )
    ),
  getRuleDetailsUrl: jest.fn().mockReturnValue(''),
}));

describe('useRuleDetailsLink', () => {
  let hookResult: RenderHookResult<UseRuleDetailsLinkParams, string | null>;

  it('should return null if the ruleId prop is null', () => {
    const initialProps: UseRuleDetailsLinkParams = {
      ruleId: null,
    };
    hookResult = renderHook((props: UseRuleDetailsLinkParams) => useRuleDetailsLink(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(null);
  });

  it('should return timeline in close state', () => {
    const initialProps: UseRuleDetailsLinkParams = {
      ruleId: 'ruleId',
    };
    hookResult = renderHook((props: UseRuleDetailsLinkParams) => useRuleDetailsLink(props), {
      initialProps,
    });

    expect(hookResult.result.current).toContain('isOpen:!f');
  });
});
