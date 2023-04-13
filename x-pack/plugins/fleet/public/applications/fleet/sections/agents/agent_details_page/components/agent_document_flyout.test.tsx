/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Agent } from '../../../../types';
import { AgentDocumentFlyout } from './agent_document_flyout';

describe('AgentDocumentFlyout', () => {
  const agent: Agent = {
    id: '123',
    packages: [],
    type: 'PERMANENT',
    active: true,
    enrolled_at: `${Date.now()}`,
    user_provided_metadata: {},
    local_metadata: {},
  };

  const renderComponent = () => {
    return render(<AgentDocumentFlyout agent={agent} onClose={jest.fn()} />);
  };

  it('renders a title with the agent id if host name is not defined', () => {
    const result = renderComponent();
    expect(result.getByText("'123' agent document")).toBeInTheDocument();
  });

  it('renders a title with the agent host name if defined', () => {
    agent.local_metadata = {
      host: {
        hostname: '456',
      },
    };
    const result = renderComponent();
    expect(result.getByText("'456' agent document")).toBeInTheDocument();
  });

  it('does not add a link to the page after clicking Download', () => {
    const result = renderComponent();
    const downloadButton = result.getByRole('button', { name: 'Download document' });
    const anchorMocked = {
      href: '',
      click: jest.fn(),
      download: '',
      setAttribute: jest.fn(),
    } as any;
    const createElementSpyOn = jest
      .spyOn(document, 'createElement')
      .mockReturnValueOnce(anchorMocked);

    downloadButton.click();
    expect(createElementSpyOn).toBeCalledWith('a');
    expect(result.queryAllByRole('link')).toHaveLength(0);
  });
});
