/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { RuleResponseEndpointAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { AlertsWithAgentType } from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alertIds, agentIds, ruleId, ruleName, hosts }: AlertsWithAgentType
) =>
  Promise.all(
    each(agentIds, async (agent) =>
      endpointAppContextService.getActionCreateService().createActionFromAlert({
        hosts,
        endpoint_ids: [agent],
        alert_ids: alertIds,
        comment: responseAction.params.comment,
        command: responseAction.params.command,
        rule_id: ruleId,
        rule_name: ruleName,
      })
    )
  );
