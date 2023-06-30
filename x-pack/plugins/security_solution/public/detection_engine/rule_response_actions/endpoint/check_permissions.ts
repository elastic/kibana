/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponseAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import { getRbacControl } from '../../../management/components/endpoint_responder/lib/console_commands_definition';
import { getUiCommand } from '../../../management/components/endpoint_response_actions_list/components/hooks';
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
