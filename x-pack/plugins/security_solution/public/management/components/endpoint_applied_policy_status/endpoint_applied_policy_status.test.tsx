/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { EndpointAppliedPolicyStatusProps } from './endpoint_applied_policy_status';
import { EndpointAppliedPolicyStatus } from './endpoint_applied_policy_status';
import React from 'react';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { POLICY_STATUS_TO_TEXT } from '../../pages/endpoint_hosts/view/host_constants';

describe('when using EndpointPolicyStatus component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: EndpointAppliedPolicyStatusProps;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    renderProps = {
      policyApplied: new EndpointDocGenerator('seed').generateHostMetadata().Endpoint.policy
        .applied,
    };

    render = () => {
      renderResult = appTestContext.render(<EndpointAppliedPolicyStatus {...renderProps} />);
      return renderResult;
    };
  });

  it('should display status from metadata `policy.applied` value', () => {
    render();

    expect(renderResult.getByTestId('policyStatus').textContent).toEqual(
      POLICY_STATUS_TO_TEXT[renderProps.policyApplied.status]
    );
  });

  it('should display status passed as `children`', () => {
    renderProps.children = 'status goes here';
    render();

    expect(renderResult.getByTestId('policyStatus').textContent).toEqual('status goes here');
  });
});
