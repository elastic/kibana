/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { buildQuery } from './build_query';

describe('Fleet - buildQuery', () => {
  it('should work', () => {
    expect(
      buildQuery({ agentId: 'some-agent-id', datasets: [], logLevels: [], userQuery: '' })
    ).toEqual(
      'elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.*)'
    );

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: ['elastic_agent'],
        logLevels: [],
        userQuery: '',
      })
    ).toEqual('elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent)');

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: ['elastic_agent', 'elastic_agent.filebeat'],
        logLevels: ['error'],
        userQuery: '',
      })
    ).toEqual(
      'elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.filebeat) and (log.level:error)'
    );

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: [],
        logLevels: ['error', 'info', 'warn'],
        userQuery: '',
      })
    ).toEqual(
      'elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.*) and (log.level:error or log.level:info or log.level:warn)'
    );

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: ['elastic_agent'],
        logLevels: ['error', 'info', 'warn'],
        userQuery: 'FLEET_GATEWAY and log.message:*',
      })
    ).toEqual(
      '(elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent) and (log.level:error or log.level:info or log.level:warn)) and (FLEET_GATEWAY and log.message:*)'
    );

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: [],
        logLevels: [],
        userQuery: 'FLEET_GATEWAY and log.message:*',
      })
    ).toEqual(
      '(elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.*)) and (FLEET_GATEWAY and log.message:*)'
    );

    expect(
      buildQuery({
        agentId: 'some-agent-id',
        datasets: [],
        logLevels: ['error'],
        userQuery: 'FLEET_GATEWAY and log.message:*',
      })
    ).toEqual(
      '(elastic_agent.id:some-agent-id and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.*) and (log.level:error)) and (FLEET_GATEWAY and log.message:*)'
    );
  });
});
