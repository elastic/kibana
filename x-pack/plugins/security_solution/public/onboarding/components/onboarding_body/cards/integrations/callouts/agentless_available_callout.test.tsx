/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { useKibana } from '../../../../../../common/lib/kibana';
import { trackOnboardingLinkClick } from '../../../../../common/lib/telemetry';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../common/lib/telemetry');

describe('AgentlessAvailableCallout', () => {
  const mockUseKibana = useKibana as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        docLinks: {
          links: {
            fleet: {
              agentlessBlog: 'https://www.elastic.co/blog',
            },
          },
        },
      },
    });
  });

  it('returns null if agentlessBlog is null', () => {
    mockUseKibana.mockReturnValue({
      services: {
        docLinks: {
          links: {
            fleet: {
              agentlessBlog: null,
            },
          },
        },
      },
    });
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

  it('should track the agentless learn more link click', () => {
    const { getByTestId } = render(<AgentlessAvailableCallout />, {
      wrapper: TestProviders,
    });

    getByTestId('agentlessLearnMoreLink').click();

    expect(trackOnboardingLinkClick).toHaveBeenCalledWith('agentless_learn_more');
  });
});
