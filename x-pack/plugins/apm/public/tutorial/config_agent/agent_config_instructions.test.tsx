/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { AgentConfigInstructions } from './agent_config_instructions';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import * as getCommands from './commands/get_apm_agent_commands';

function Wrapper({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

describe('AgentConfigInstructions', () => {
  let getApmAgentCommandsSpy: jest.SpyInstance;
  beforeAll(() => {
    getApmAgentCommandsSpy = jest.spyOn(getCommands, 'getApmAgentCommands');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders OpenTelemetry instructions when the variant is "openTelemetry"', async () => {
    const component = render(
      <AgentConfigInstructions
        variantId="openTelemetry"
        apmServerUrl="http://localhost:8200"
        secretToken="testSecretToken"
      />,
      { wrapper: Wrapper }
    );

    expect(getApmAgentCommandsSpy).not.toHaveBeenCalled();
    expect(
      await component.queryByTestId('otel-instructions-table')
    ).toBeInTheDocument();
    expect(await component.queryByTestId('commands')).not.toBeInTheDocument();
  });

  it('calls getApmAgentCommands and renders the java instructions when the variant is "java"', async () => {
    const component = render(
      <AgentConfigInstructions
        variantId="java"
        apmServerUrl="http://localhost:8200"
        secretToken="testSecretToken"
      />
    );

    expect(getApmAgentCommandsSpy).toHaveBeenCalled();
    expect(await component.queryByTestId('commands')).toBeInTheDocument();
    expect(
      await component.queryByTestId('otel-instructions-table')
    ).not.toBeInTheDocument();
  });
});
