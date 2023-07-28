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
// import { useHasActionsPrivileges } from '../../../detection_engine/rule_management_ui/components/rules_table/use_has_actions_privileges';
import { useHasMlPermissions } from '../../../detection_engine/rule_management_ui/components/rules_table/use_has_ml_permissions';
import { useUserData } from '../../../detections/components/user_info';
import {
  canEditRuleWithActions,
  // explainLackOfPermission,
  hasUserCRUDPermission,
} from '../../../common/utils/privileges';

jest.mock(
  '../../../detection_engine/rule_management_ui/components/rules_table/use_has_actions_privileges'
);
jest.mock(
  '../../../detection_engine/rule_management_ui/components/rules_table/use_has_ml_permissions'
);
jest.mock('../../../detections/components/user_info');
jest.mock('../../../common/utils/privileges');

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
    (useUserData as jest.Mock).mockReturnValue([{ loading: true }]);
    hookResult = renderHook(() => useRuleSwitch(defaultProps));
    expect(hookResult.result.current.userInfoLoading).toEqual(true);

    (useUserData as jest.Mock).mockReturnValue([{ loading: false }]);
    hookResult = renderHook(() => useRuleSwitch(defaultProps));
    expect(hookResult.result.current.userInfoLoading).toEqual(false);
  });

  describe('should return correct button state if rule is ml rule', () => {
    beforeEach(() => {
      (canEditRuleWithActions as jest.Mock).mockReturnValue(true);
      (useUserData as jest.Mock).mockReturnValue([{ loading: false, canUserCRUD: true }]);
      (hasUserCRUDPermission as jest.Mock).mockReturnValue(true);
    });

    it('button should not be disabled with ml permission', () => {
      (useHasMlPermissions as jest.Mock).mockReturnValue(true);
      hookResult = renderHook(() => useRuleSwitch(mlProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(false);
    });

    it('button should be disabled without ml permission', () => {
      (useHasMlPermissions as jest.Mock).mockReturnValue(false);
      hookResult = renderHook(() => useRuleSwitch(mlProps));
      expect(hookResult.result.current.isButtonDisabled).toEqual(true);
    });
  });

  // describe('should return correct button state if rule is not ml rule', () => {
  // });
});
