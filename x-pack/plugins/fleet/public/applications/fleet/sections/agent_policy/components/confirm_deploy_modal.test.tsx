/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';

import { ConfirmDeployAgentPolicyModal } from './confirm_deploy_modal';

describe('ConfirmDeployAgentPolicyModal', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = (props: any) =>
    (renderResult = testRenderer.render(
      <ConfirmDeployAgentPolicyModal
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        agentCount={0}
        agentPolicies={[{ name: 'Agent policy 1' }, { name: 'Agent policy 2' }]}
        agentPoliciesToAdd={[]}
        agentPoliciesToRemove={[]}
        {...props}
      />
    ));

  it('should render agent count with agent policies', () => {
    testRenderer = createFleetTestRendererMock();
    render({
      agentCount: 1,
    });
    expect(renderResult.getByText('This action will update 1 agent')).toBeInTheDocument();
    expect(renderResult.getByText('Agent policy 1, Agent policy 2')).toBeInTheDocument();
  });

  it('should render agent policies to add and remove if no agent count', () => {
    testRenderer = createFleetTestRendererMock();
    render({
      agentCount: 0,
      agentPoliciesToAdd: ['Agent policy 1', 'Agent policy 2'],
      agentPoliciesToRemove: ['Agent policy 3'],
    });
    expect(
      renderResult.getByText('This action will update the selected agent policies')
    ).toBeInTheDocument();
    const calloutText = renderResult.getByTestId('confirmAddRemovePoliciesCallout').textContent;
    expect(calloutText).toContain(
      'Agent policies that will be updated to use this integration policy:Agent policy 1Agent policy 2'
    );
    expect(calloutText).toContain(
      'Agent policies that will be updated to remove this integration policy:Agent policy 3'
    );
  });

  it('should render no agent policies message when not adding/removing agent policies', () => {
    testRenderer = createFleetTestRendererMock();
    render({
      agentCount: 0,
      agentPolicies: [],
      agentPoliciesToRemove: [],
    });
    const calloutText = renderResult.getByTestId('confirmNoPoliciesCallout').textContent;
    expect(calloutText).toContain('No agent policies selected');
    expect(calloutText).toContain('This integration will not be added to any agent policies.');
  });
});
