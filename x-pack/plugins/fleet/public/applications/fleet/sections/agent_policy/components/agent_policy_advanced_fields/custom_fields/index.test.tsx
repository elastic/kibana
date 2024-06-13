/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import type { NewAgentPolicy, AgentPolicy, PackagePolicyInput } from '../../../../../types';

import { GLOBAL_DATA_TAG_EXCLUDED_INPUTS } from '../../../../../../../../common/constants';

import {
  createAgentPolicyMock,
  createPackagePolicyMock,
} from '../../../../../../../../common/mocks';

import { CustomFields } from '.';

describe('CustomFields', () => {
  let testRenderer: TestRenderer;
  let renderResult: RenderResult;
  const mockUpdateAgentPolicy = jest.fn();

  const renderComponent = (agentPolicy: Partial<AgentPolicy | NewAgentPolicy>) => {
    renderResult = testRenderer.render(
      <CustomFields agentPolicy={agentPolicy} updateAgentPolicy={mockUpdateAgentPolicy} />
    );
  };

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const mockAgentPolicy = createAgentPolicyMock({
      global_data_tags: [],
      package_policies: [createPackagePolicyMock()],
    });
    renderComponent(mockAgentPolicy);
    expect(renderResult.getByText('Custom fields')).toBeInTheDocument();
    expect(renderResult.getByText('This policy has no custom fields')).toBeInTheDocument();
  });

  it('should render unsupported inputs warning if there are unsupported inputs', () => {
    const unsupportedInputTypes = Array.from(GLOBAL_DATA_TAG_EXCLUDED_INPUTS);

    const mockAgentPolicy = createAgentPolicyMock({
      global_data_tags: [],
      package_policies: [
        {
          ...createPackagePolicyMock(),
          inputs: [
            { type: 'supported' } as PackagePolicyInput,
            ...unsupportedInputTypes.map((type) => ({ type } as PackagePolicyInput)),
          ],
        },
      ],
    });

    renderComponent(mockAgentPolicy);

    const unsupportedInputsWarning = renderResult.getByText('Unsupported Inputs');
    expect(unsupportedInputsWarning).toBeInTheDocument();

    const strongElements = renderResult.container.querySelector('strong');
    const unsupportedInputs =
      strongElements?.textContent?.split(', ').map((element) => element.trim()) ?? [];

    expect(unsupportedInputs.sort()).toEqual(unsupportedInputTypes.sort());
  });

  it('should not render unsupported inputs warning if there are no unsupported inputs', () => {
    const mockAgentPolicy = createAgentPolicyMock({
      global_data_tags: [],
      package_policies: [
        {
          ...createPackagePolicyMock(),
          inputs: [{ type: 'supported1' } as PackagePolicyInput],
        },
      ],
    });
    renderComponent(mockAgentPolicy);
    expect(renderResult.queryByText('Unsupported Inputs')).not.toBeInTheDocument();
  });

  it('should render global data tags table with initial tags', () => {
    const mockAgentPolicy = createAgentPolicyMock({
      global_data_tags: [{ name: 'tag1', value: 'value1' }],
    });
    renderComponent(mockAgentPolicy);
    expect(renderResult.getByText('tag1')).toBeInTheDocument();
    expect(renderResult.getByText('value1')).toBeInTheDocument();
  });
});
