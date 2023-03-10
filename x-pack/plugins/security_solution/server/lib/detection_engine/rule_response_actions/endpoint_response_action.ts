/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, uniq } from 'lodash';
import type { EndpointAppContext } from '../../../endpoint/types';
import type { RuleResponseEndpointAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { AlertsWithAgentType } from './types';

export const endpointResponseAction = (
  responseAction: RuleResponseEndpointAction,
  endpointAppContext: EndpointAppContext,
  { alertIds, agents }: AlertsWithAgentType
) =>
  each(uniq(agents), (agent) =>
    endpointAppContext.service.getActionCreateService().createAction({
      endpoint_ids: [agent],
      alert_ids: alertIds,
      comment: responseAction.params.comment,
      command: responseAction.params.command,
    })
  );
