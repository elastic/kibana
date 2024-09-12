/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentTypeForAgentIdField } from './get_agent_type_for_agent_id_field';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS } from '../../../../../common/endpoint/service/response_actions/constants';

describe('getAgentTypeForAgentIdField()', () => {
  it('should return default agent type (endpoint) when field is unknown', () => {
    expect(getAgentTypeForAgentIdField('foo.bar')).toEqual('endpoint');
  });

  // A flat map of `Array<[agentType, field]>`
  const testConditions = Object.entries(RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS)
    .map(([agentType, fields]) => {
      return fields.map((field) => [agentType, field]);
    })
    .flat();

  it.each(testConditions)('should return `%s` for field `%s`', (agentType, field) => {
    expect(getAgentTypeForAgentIdField(field)).toEqual(agentType);
  });
});
