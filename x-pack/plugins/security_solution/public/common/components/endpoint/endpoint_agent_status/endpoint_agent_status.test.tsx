/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';
import type { EndpointAgentStatusProps } from './endpoint_agent_status';
import { EndpointAgentStatus } from './endpoint_agent_status';
import { HostStatus } from '../../../../../common/endpoint/types';
import React from 'react';

describe('When using the EndpointAgentStatus component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: EndpointAgentStatusProps;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    renderProps = {
      status: HostStatus.HEALTHY,
      'data-test-subj': 'test',
      pendingActions: {},
    };

    render = () => {
      renderResult = appTestContext.render(<EndpointAgentStatus {...renderProps} />);
      return renderResult;
    };
  });

  it.todo('should display status');

  it.todo('should display status and isolated');

  it.todo('should display status and action count');

  it.todo('should display status and isolating');

  it.todo('should display status and releasing');

  it.todo('should individual action count in tooltip');

  it.todo('should should keep actions up to date when autoRefresh is true');

  it.todo('should still display status if action summary api fails');

  describe('And when using EndpointAgentStatusById', () => {
    it.todo('should keep agent status up to date when autoRefresh is true');

    it.todo('should display empty value if API call to host metadata fails');
  });
});
