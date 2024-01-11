/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ThemeProvider } from 'styled-components';

import type { Agent } from '../../../../../types';
import { useLink } from '../../../../../hooks';
import { createPackagePolicyMock } from '../../../../../../../../common/mocks';

import { AgentDetailsIntegrationInputs } from './agent_details_integration_inputs';

jest.mock('../../../../../hooks');
const mockUseLink = useLink as jest.Mock;

describe('AgentDetailsIntegrationInputs', () => {
  const agent: Agent = {
    id: '123',
    packages: [],
    type: 'PERMANENT',
    active: true,
    enrolled_at: `${Date.now()}`,
    user_provided_metadata: {},
    local_metadata: {},
  };

  const packageMock = createPackagePolicyMock();

  beforeEach(() => {
    mockUseLink.mockReturnValue({ getHref: jest.fn() });
  });

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <ThemeProvider theme={() => ({ eui: { euiSizeS: '15px' } })}>
          <AgentDetailsIntegrationInputs agent={agent} packagePolicy={packageMock} />
        </ThemeProvider>
      </IntlProvider>
    );
  };

  it('renders a default health icon when the agent has no components at all', () => {
    const component = renderComponent();
    userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthDefault')
    ).toBeInTheDocument();
  });

  it('renders a default health icon when the package input has no match in the agent component units', () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
        units: [
          {
            id: 'endpoint-default',
            type: 'input',
            status: 'HEALTHY',
            message: 'Applied policy',
          },
        ],
      },
    ];

    const component = renderComponent();
    userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthDefault')
    ).toBeInTheDocument();
  });

  it('renders a success health icon when the package input has a match in the agent component units', () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
        units: [
          {
            id: `endpoint-default-${packageMock.id}`,
            type: 'input',
            status: 'HEALTHY',
            message: 'Applied policy',
          },
        ],
      },
    ];

    const component = renderComponent();
    userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthSuccess')
    ).toBeInTheDocument();
  });

  it('does not render when there is no units array', () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
      },
    ];

    const component = renderComponent();
    userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.queryByTestId('agentDetailsIntegrationsInputStatusHealthSuccess')
    ).not.toBeInTheDocument();
  });

  it('should not throw error when there is no components', () => {
    agent.components = undefined;

    const component = renderComponent();
    userEvent.click(component.container.querySelector('#agentIntegrationsInputs')!);
    userEvent.click(component.container.querySelector('#endpoint')!);
    expect(component.getByText('Endpoint')).toBeInTheDocument();
  });
});
