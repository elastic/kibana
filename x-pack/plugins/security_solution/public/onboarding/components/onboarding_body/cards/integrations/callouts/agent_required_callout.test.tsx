/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { AgentRequiredCallout } from './agent_required_callout';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { trackOnboardingLinkClick } from '../../../../lib/telemetry';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../lib/telemetry');

describe('AgentRequiredCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the warning callout when an agent is still required', () => {
    const { getByTestId, getByText } = render(<AgentRequiredCallout />, { wrapper: TestProviders });

    expect(
      getByText('Elastic Agent is required for one or more of your integrations. Add Elastic Agent')
    ).toBeInTheDocument();
    expect(getByTestId('agentLink')).toBeInTheDocument();
  });

  it('should track the agent link click', () => {
    const { getByTestId } = render(<AgentRequiredCallout />, { wrapper: TestProviders });

    getByTestId('agentLink').click();

    expect(trackOnboardingLinkClick).toHaveBeenCalledWith('agent_required');
  });
});
