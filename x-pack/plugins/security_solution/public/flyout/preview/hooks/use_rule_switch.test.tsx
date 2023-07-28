/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import type { UseRuleSwitchParams, UseRuleSwitchResult } from './use_rule_switch';
import { useRuleSwitch } from './use_rule_switch';
import { useHasMlPermissions } from '../../../detection_engine/rule_management_ui/components/rules_table/use_has_ml_permissions';
import { useUserData } from '../../../detections/components/user_info';
import { canEditRuleWithActions, hasUserCRUDPermission } from '../../../common/utils/privileges';

const mockUseUserData = useUserData as jest.Mock;
jest.mock('../../../detections/components/user_info');

const mockCanEditRuleWithActions = canEditRuleWithActions as jest.Mock;
const mockHasUserCRUDPermission = hasUserCRUDPermission as jest.Mock;
jest.mock('../../../common/utils/privileges');

const mockUseHasMlPermissions = useHasMlPermissions as jest.Mock;
jest.mock(
  '../../../detection_engine/rule_management_ui/components/rules_table/use_has_ml_permissions'
);

jest.mock(
  '../../../detection_engine/rule_management_ui/components/rules_table/use_has_actions_privileges'
);

const defaultProps = {
  rule: {} as Rule,
  isExistingRule: true,
};

const mlProps = {
  rule: { type: 'machine_learning' } as unknown as Rule,
  isExistingRule: true,
};

describe('useRuleSwitch', () => {
  let hookResult: RenderHookResult<UseRuleSwitchParams, UseRuleSwitchResult>;

  it('should return correct userInfoLoading', () => {
    mockUseUserData.mockReturnValue([{ loading: true }]);
    hookResult = renderHook(() => useRuleSwitch(defaultProps));
    expect(hookResult.result.current.userInfoLoading).toEqual(true);

    mockUseUserData.mockReturnValue([{ loading: false }]);
    hookResult = renderHook(() => useRuleSwitch(defaultProps));
    expect(hookResult.result.current.userInfoLoading).toEqual(false);
  });

  describe('should return correct button state if rule is ml rule', () => {
    beforeEach(() => {
      mockCanEditRuleWithActions.mockReturnValue(true);
      mockUseUserData.mockReturnValue([{ loading: false, canUserCRUD: true }]);
      mockHasUserCRUDPermission.mockReturnValue(true);
    });

    it('button should not be disabled with ml permission', () => {
      mockUseHasMlPermissions.mockReturnValue(true);
      hookResult = renderHook(() => useRuleSwitch(mlProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(false);
    });

    it('button should be disabled without ml permission', () => {
      mockUseHasMlPermissions.mockReturnValue(false);
      hookResult = renderHook(() => useRuleSwitch(mlProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(true);
    });
  });

  describe('should return correct button state if rule is not ml rule', () => {
    beforeEach(() => {
      mockUseUserData.mockReturnValue([{ loading: false, canUserCRUD: true }]);
      mockCanEditRuleWithActions.mockReturnValue(true);
      mockHasUserCRUDPermission.mockReturnValue(true);
      mockUseHasMlPermissions.mockReturnValue(false);
    });

    it('should disable button if rule is not an existing rule', () => {
      hookResult = renderHook(() => useRuleSwitch({ ...defaultProps, isExistingRule: false }));
      expect(hookResult.result.current.isButtonDisabled).toEqual(true);
    });

    it('should disable button if user cannot edut rule with actions', () => {
      mockCanEditRuleWithActions.mockReturnValue(false);
      hookResult = renderHook(() => useRuleSwitch(defaultProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(true);
    });

    it('should disable button if user does not have CRUD permission', () => {
      mockHasUserCRUDPermission.mockReturnValue(false);
      hookResult = renderHook(() => useRuleSwitch(defaultProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(true);
    });
  });
});
