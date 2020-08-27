/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAgentAction } from './actions';
import { SavedObject } from 'kibana/server';
import { AgentAction } from '../../../common/types/models';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { esKuery } from '../../../../../../src/plugins/data/server';

describe('test agent actions services', () => {
  it('should create a new action', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const newAgentAction: Omit<AgentAction, 'id'> = {
      agent_id: 'agentid',
      type: 'CONFIG_CHANGE',
      data: { content: 'data' },
      sent_at: '2020-03-14T19:45:02.620Z',
      created_at: '2020-03-14T19:45:02.620Z',
    };
    mockSavedObjectsClient.create.mockReturnValue(
      Promise.resolve({
        attributes: {},
      } as SavedObject)
    );
    await createAgentAction(mockSavedObjectsClient, newAgentAction);

    const createdAction = (mockSavedObjectsClient.create.mock
      .calls[0][1] as unknown) as AgentAction;
    expect(createdAction).toBeDefined();
    expect(createdAction?.type).toEqual(newAgentAction.type);
    expect(createdAction?.data).toEqual(JSON.stringify(newAgentAction.data));
    expect(createdAction?.sent_at).toEqual(newAgentAction.sent_at);
  });
});

class Benchmark {
  private static NS_PER_SEC = 1e9;
  #startTime?: [number, number];
  #elapsed?: [number, number];

  start() {
    if (this.#startTime) {
      throw new Error(`Start?? We're started, we can't start again!`);
    }

    this.#startTime = process.hrtime();
  }
  stop() {
    if (this.#startTime == null) {
      throw new Error(`Stop?? We haven't even started yet!`);
    }

    this.#elapsed = process.hrtime(this.#startTime);
  }

  describe() {
    if (this.#elapsed == null) {
      return `Benchmark is still running`;
    }

    return `Benchmark took ${
      this.#elapsed[0] * Benchmark.NS_PER_SEC + this.#elapsed[1]
    } nanoseconds`;
  }
}

describe('micro-benchmark', () => {
  test('parsing KQL expression', () => {
    const b = new Benchmark();
    b.start();
    esKuery.fromKueryExpression(
      'not fleet-agent-actions.attributes.sent_at: * and fleet-agent-actions.attributes.agent_id:1234567'
    );
    b.stop();
    console.log(b.describe());
  });

  test('manually building KueryNode', () => {
    const b = new Benchmark();
    b.start();
    esKuery.nodeTypes.function.buildNode('and', [
      esKuery.nodeTypes.function.buildNode(
        'not',
        esKuery.nodeTypes.function.buildNode('is', 'fleet-agent-actions.attributes.sent_at', '*')
      ),
      esKuery.nodeTypes.function.buildNode(
        'is',
        'fleet-agent-actions.attributes.agent_id',
        '1234567'
      ),
    ]);
    b.stop();
    console.log(b.describe());
  });

  test('doing nothing', () => {
    const b = new Benchmark();
    b.start();
    b.stop();
    console.log(b.describe());
  });
});
