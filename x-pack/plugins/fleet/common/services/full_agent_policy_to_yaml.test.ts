/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentPolicy } from '../types';

import { fullAgentPolicyToYaml } from './full_agent_policy_to_yaml';

describe('fullAgentPolicyToYaml', () => {
  it('should replace secrets', () => {
    const agentPolicyWithSecrets = {
      id: '1234',
      outputs: { default: { type: 'elasticsearch', hosts: ['http://localhost:9200'] } },
      inputs: [
        {
          id: 'test_input-secrets-abcd1234',
          revision: 1,
          name: 'secrets-1',
          type: 'test_input',
          data_stream: { namespace: 'default' },
          use_output: 'default',
          package_policy_id: 'abcd1234',
          package_var_secret: '$co.elastic.secret{secret-id-1}',
          input_var_secret: '$co.elastic.secret{secret-id-2}',
          streams: [
            {
              id: 'test_input-secrets.log-abcd1234',
              data_stream: { type: 'logs', dataset: 'secrets.log' },
              package_var_secret: '$co.elastic.secret{secret-id-1}',
              input_var_secret: '$co.elastic.secret{secret-id-2}',
              stream_var_secret: '$co.elastic.secret{secret-id-3}',
            },
          ],
          meta: { package: { name: 'secrets', version: '1.0.0' } },
        },
      ],
      secret_references: [{ id: 'secret-id-1' }, { id: 'secret-id-2' }, { id: 'secret-id-3' }],
      revision: 2,
      agent: {},
      signed: {},
      output_permissions: {},
      fleet: {},
    } as unknown as FullAgentPolicy;

    const yaml = fullAgentPolicyToYaml(agentPolicyWithSecrets, (policy) => JSON.stringify(policy));

    expect(yaml).toMatchInlineSnapshot(
      `"{\\"id\\":\\"1234\\",\\"outputs\\":{\\"default\\":{\\"type\\":\\"elasticsearch\\",\\"hosts\\":[\\"http://localhost:9200\\"]}},\\"inputs\\":[{\\"id\\":\\"test_input-secrets-abcd1234\\",\\"revision\\":1,\\"name\\":\\"secrets-1\\",\\"type\\":\\"test_input\\",\\"data_stream\\":{\\"namespace\\":\\"default\\"},\\"use_output\\":\\"default\\",\\"package_policy_id\\":\\"abcd1234\\",\\"package_var_secret\\":\\"\${SECRET_0}\\",\\"input_var_secret\\":\\"\${SECRET_1}\\",\\"streams\\":[{\\"id\\":\\"test_input-secrets.log-abcd1234\\",\\"data_stream\\":{\\"type\\":\\"logs\\",\\"dataset\\":\\"secrets.log\\"},\\"package_var_secret\\":\\"\${SECRET_0}\\",\\"input_var_secret\\":\\"\${SECRET_1}\\",\\"stream_var_secret\\":\\"\${SECRET_2}\\"}],\\"meta\\":{\\"package\\":{\\"name\\":\\"secrets\\",\\"version\\":\\"1.0.0\\"}}}],\\"secret_references\\":[{\\"id\\":\\"secret-id-1\\"},{\\"id\\":\\"secret-id-2\\"},{\\"id\\":\\"secret-id-3\\"}],\\"revision\\":2,\\"agent\\":{},\\"signed\\":{},\\"output_permissions\\":{},\\"fleet\\":{}}"`
    );
  });
});
