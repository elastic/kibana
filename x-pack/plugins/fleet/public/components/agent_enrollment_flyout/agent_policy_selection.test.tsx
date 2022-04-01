/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import type { TestRenderer } from '../../mock';
import { createFleetTestRendererMock } from '../../mock';

import type { AgentPolicy } from '../../types';

import { AgentPolicySelection } from '.';

describe('step select agent policy', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  let agentPolicies: AgentPolicy[] = [];
  const render = () =>
    (renderResult = testRenderer.render(
      <AgentPolicySelection
        setSelectedPolicyId={jest.fn()}
        selectedPolicy={agentPolicies[0]}
        agentPolicies={agentPolicies}
        withKeySelection={false}
        excludeFleetServer={true}
        onClickCreatePolicy={jest.fn()}
        isFleetServerPolicy={false}
      />
    ));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  test('should not select agent policy by default if multiple exists', async () => {
    agentPolicies = [
      { id: 'policy-1', name: 'Policy 1' } as AgentPolicy,
      { id: 'policy-2', name: 'Policy 2' } as AgentPolicy,
    ];

    render();

    await act(async () => {
      const select = renderResult.container.querySelector('[data-test-subj="agentPolicyDropdown"]');
      expect((select as any)?.value).toEqual('');

      expect(renderResult.getAllByRole('option').length).toBe(2);
    });
  });

  test('should select agent policy by default if one exists', async () => {
    agentPolicies = [{ id: 'policy-1', name: 'Policy 1' } as AgentPolicy];

    render();

    await act(async () => {
      const select = renderResult.container.querySelector('[data-test-subj="agentPolicyDropdown"]');
      expect((select as any)?.value).toEqual('policy-1');
    });
  });
});
