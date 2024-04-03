/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../common/endpoint/service/response_actions/constants';
import type { RuleResponseAction } from '../../../../common/api/detection_engine';
import { getRbacControl } from '../../../../common/endpoint/service/response_actions/utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';

// returns false if the user does have the required privileges to execute the action, returns true if the user does not have the required privileges
export const useCheckEndpointPermissions = (action: RuleResponseAction) => {
  const endpointPrivileges = useUserPrivileges().endpointPrivileges;

  if (action?.actionTypeId === '.endpoint' && action?.params?.command) {
    return !getRbacControl({
      commandName: RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[action.params.command],
      privileges: endpointPrivileges,
    });
  }
};
