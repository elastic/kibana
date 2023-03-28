/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
} from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ExecuteActionHostResponseOutput,
  type ExecuteActionHostResponseOutputProps,
} from './execute_action_host_response_output';

describe('When using the `ExecuteActionHostResponseOutput` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: ExecuteActionHostResponseOutputProps;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    renderProps = {
      action: new EndpointActionGenerator('seed').generateActionDetails<
        ResponseActionExecuteOutputContent,
        ResponseActionsExecuteParameters
      >({ command: 'execute' }),
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<ExecuteActionHostResponseOutput {...renderProps} />);
      return renderResult;
    };
  });

  it('should show execute output and execute errors', async () => {
    render();
    expect(renderResult.getByTestId('test')).toBeTruthy();
  });

  it('should show execute output as `open`', async () => {
    render();
    const accordionOutputButton = Array.from(
      renderResult.getByTestId('test').querySelectorAll('.euiAccordion')
    )[0];
    expect(accordionOutputButton.className).toContain('isOpen');
  });

  it('should show nothing when no output in action details', () => {
    (renderProps.action as ActionDetails).outputs = {};
    render();
    expect(renderResult.queryByTestId('test')).toBeNull();
  });
});
