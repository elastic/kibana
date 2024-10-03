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
import * as consts from './const';

interface MockedConsts {
  AGENTLESS_LEARN_MORE_LINK: string | null;
}
jest.mock('./const');

describe('AgentlessAvailableCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked<MockedConsts>(consts).AGENTLESS_LEARN_MORE_LINK = 'https://www.elastic.co';
  });

  it('returns null if AGENTLESS_LEARN_MORE_LINK is null', () => {
    jest.mocked<MockedConsts>(consts).AGENTLESS_LEARN_MORE_LINK = null;

    const { container } = render(<AgentlessAvailableCallout />, {
      wrapper: TestProviders,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the agentless available text', () => {
    const { getByText, getByTestId } = render(<AgentlessAvailableCallout />, {
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
