/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AgentConfigurationTable } from './agent_config_table';

describe('AgentConfigurationTable', () => {
  it('renders the table with the correct values', () => {
    const variables = {
      apmEnvironment: 'Delastic.apm.environment',
      apmServerUrl: 'Delastic.apm.server_url',
      apmServiceName: 'Delastic.apm.service_name',
      secretToken: 'Delastic.apm.secret_token',
    };

    const data = {
      apmServerUrl: 'http://localhost:8200',
      secretToken: 'my-secret-token',
      apmServiceName: 'my-service-name',
      apmEnvironment: 'my-environment',
    };

    const { getByText } = render(<AgentConfigurationTable variables={variables} data={data} />);

    expect(getByText('my-service-name')).toBeInTheDocument();
  });

  describe('when secretToken is not provided', () => {
    it('renders the placeholder for secretToken', () => {
      const variables = {
        apmEnvironment: 'Delastic.apm.environment',
        apmServerUrl: 'Delastic.apm.server_url',
        apmServiceName: 'Delastic.apm.service_name',
        secretToken: 'Delastic.apm.secret_token',
      };

      const data = {
        apmServerUrl: 'http://localhost:8200',
        secretToken: '',
        apmServiceName: 'my-service-name',
        apmEnvironment: 'my-environment',
      };

      const { getByText } = render(<AgentConfigurationTable variables={variables} data={data} />);

      expect(getByText('<SECRET_TOKEN>')).toBeInTheDocument();
    });
  });
});
