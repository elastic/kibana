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

  it('should display host status only when `isIsolated` is undefined', () => {
    render();

    expect(renderResult.queryByTestId('test-isolationStatus')).toBeNull();
  });

  it('should display pending status and pending counts', () => {
    renderProps.isIsolated = true;
    render();

    expect(renderResult.getByTestId('test-isolationStatus')).toBeTruthy();
  });
});
