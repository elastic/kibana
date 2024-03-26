/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { mockObservedHostData } from '../../mocks';
import { policyFields } from './endpoint_policy_fields';

const TestWrapper = ({ el }: { el: JSX.Element | undefined }) => <>{el}</>;

jest.mock('../../../../common/hooks/use_agent_status', () => {
  const original = jest.requireActual('../../../../common/hooks/use_agent_status');
  return {
    ...original,
    useAgentStatus: () => ({
      data: {
        // @ts-ignore
        [mockObservedHostData.details.endpoint?.hostInfo?.metadata.agent.id]: {
          pendingActions: {},
          status: 'healthy',
        },
      },
    }),
  };
});

describe('Endpoint Policy Fields', () => {
  it('renders policy name', () => {
    const policyName = policyFields[0];

    const { container } = render(<TestWrapper el={policyName.render?.(mockObservedHostData)} />);

    expect(container).toHaveTextContent('policy-name');
  });

  it('renders policy status', () => {
    const policyStatus = policyFields[1];

    const { container } = render(<TestWrapper el={policyStatus.render?.(mockObservedHostData)} />);

    expect(container).toHaveTextContent('failure');
  });

  it('renders agent status', () => {
    const agentStatus = policyFields[3];

    const { container } = render(<TestWrapper el={agentStatus.render?.(mockObservedHostData)} />, {
      wrapper: TestProviders,
    });

    expect(container).toHaveTextContent('Healthy');
  });
});
