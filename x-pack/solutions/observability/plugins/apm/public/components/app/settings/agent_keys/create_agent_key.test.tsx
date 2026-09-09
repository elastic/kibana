/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { CreateAgentKeyFlyout } from './create_agent_key';

const mockCallApmApi = jest.fn();

jest.mock('../../../../hooks/use_current_user', () => ({
  useCurrentUser: () => undefined,
}));

jest.mock('../../../../services/rest/create_call_apm_api', () => ({
  callApmApi: (...args: unknown[]) => mockCallApmApi(...args),
  createCallApmApi: jest.fn(),
}));

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiThemeProvider>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </EuiThemeProvider>
  );
}

describe('CreateAgentKeyFlyout', () => {
  beforeEach(() => {
    mockCallApmApi.mockReset();
  });

  it('ignores additional clicks while a create request is in flight', async () => {
    let resolveCreate: (value: { agentKey: { id: string; name: string } }) => void = () => {};
    mockCallApmApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    const onSuccess = jest.fn();
    const onError = jest.fn();
    const { getByTestId } = render(
      <CreateAgentKeyFlyout onCancel={() => {}} onSuccess={onSuccess} onError={onError} />,
      { wrapper: Wrapper }
    );

    fireEvent.change(getByTestId('apmCreateAgentKeyFlyoutFieldText'), {
      target: { value: 'test-key' },
    });

    const createButton = getByTestId('apmCreateAgentKeyFlyoutButton');
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(mockCallApmApi).toHaveBeenCalledTimes(1);

    resolveCreate({ agentKey: { id: '1', name: 'test-key' } });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
