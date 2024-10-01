/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { AgentlessAvailableCallout } from './agentless_available_callout';

const props = {
  addAgentLink: '',
  onAddAgentClick: jest.fn(),
};

describe('AgentlessAvailableCallout', () => {
  it('renders the agentless available text', () => {
    const { getByText, getByTestId } = render(<AgentlessAvailableCallout {...props} />, {
      wrapper: TestProviders,
    });
    expect(getByText('NEW')).toBeInTheDocument();
    expect(
      getByText(
        'Identify configuration risks in your cloud account with new and simplified agentless configuration'
      )
    ).toBeInTheDocument();
    expect(getByTestId('agentlessLearnMoreLink')).toBeInTheDocument();
  });
});
