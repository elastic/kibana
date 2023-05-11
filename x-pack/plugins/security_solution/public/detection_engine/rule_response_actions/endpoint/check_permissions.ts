/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRbacControl, getUiCommand } from '../../../../common/endpoint/utils/commands';
import type { RuleResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { useUserPrivileges } from '../../../common/components/user_privileges';

export const useCheckEndpointPermissions = (action: RuleResponseAction) => {
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;

  if (action?.actionTypeId === '.endpoint' && action?.params?.command) {
    return !getRbacControl({
      commandName: getUiCommand(action.params.command),
      privileges: endpointPrivileges,
    });
  }
};
