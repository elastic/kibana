/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MockApmPluginContextWrapper,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { MissingDataCallout } from '.';

function renderCallout(value: Partial<ApmPluginContextValue> = {}) {
  return render(
    <MockApmPluginContextWrapper value={value as ApmPluginContextValue}>
      <MissingDataCallout />
    </MockApmPluginContextWrapper>
  );
}

describe('MissingDataCallout', () => {
  it('renders the callout with title and the managed OTLP docs link', () => {
    renderCallout();

    expect(screen.getByTestId('apmMissingDataCallout')).toBeInTheDocument();
    expect(screen.getByText('Do you miss some data?')).toBeInTheDocument();
    expect(screen.getByTestId('apmMissingDataCalloutDocsLink')).toBeInTheDocument();
    expect(screen.getByTestId('apmMissingDataCalloutSetup')).toBeInTheDocument();
  });

  it('hides the "Ask AI" button when agentBuilder is not available', () => {
    renderCallout();
    expect(screen.queryByTestId('apmMissingDataCalloutAskAi')).not.toBeInTheDocument();
  });

  it('calls agentBuilder.openChat with autoSendInitialMessage when "Ask AI" is clicked', () => {
    const openChat = jest.fn();

    renderCallout({
      agentBuilder: { openChat } as unknown as ApmPluginContextValue['agentBuilder'],
    });

    const askAiButton = screen.getByTestId('apmMissingDataCalloutAskAi');
    expect(askAiButton).toBeInTheDocument();

    fireEvent.click(askAiButton);

    expect(openChat).toHaveBeenCalledTimes(1);
    const args = openChat.mock.calls[0][0];
    expect(args.newConversation).toBe(true);
    expect(args.autoSendInitialMessage).toBe(true);
    expect(typeof args.initialMessage).toBe('string');
    expect(args.initialMessage.length).toBeGreaterThan(0);
  });
});
