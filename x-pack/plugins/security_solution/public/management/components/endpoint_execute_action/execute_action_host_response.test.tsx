/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
  ActionDetails,
} from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ExecuteActionHostResponse,
  type ExecuteActionHostResponseProps,
} from './execute_action_host_response';
import { getEmptyValue } from '@kbn/cases-plugin/public/components/empty_value';

describe('When using the `ExecuteActionHostResponse` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: ExecuteActionHostResponseProps;
  const action = new EndpointActionGenerator('seed').generateActionDetails<
    ResponseActionExecuteOutputContent,
    ResponseActionsExecuteParameters
  >({ command: 'execute', agents: ['agent-a'] });

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    renderProps = {
      action,
      canAccessFileDownloadLink: true,
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<ExecuteActionHostResponse {...renderProps} />);
      return renderResult;
    };
  });

  it('should show execute output and execute errors', async () => {
    render();
    expect(renderResult.getByTestId('test-executeResponseOutput')).toBeTruthy();
  });

  it('should show execute output accordion as `open`', async () => {
    render();
    const accordionOutputButton = Array.from(
      renderResult.getByTestId('test-executeResponseOutput').querySelectorAll('.euiAccordion')
    )[0];
    expect(accordionOutputButton.className).toContain('isOpen');
  });

  it('should show `-` in output accordion when no output content', async () => {
    (renderProps.action as ActionDetails).outputs = {
      'agent-a': {
        type: 'json',
        content: {
          ...(renderProps.action as ActionDetails).outputs?.[action.agents[0]].content,
          stdout: '',
        },
      },
    };
    render();
    const accordionOutputButton = Array.from(
      renderResult.getByTestId('test-executeResponseOutput').querySelectorAll('.euiAccordion')
    )[0];
    expect(accordionOutputButton.textContent).toContain(
      `Execution output (truncated)${getEmptyValue()}`
    );
  });

  it('should show `-` in error accordion when no error content', async () => {
    (renderProps.action as ActionDetails).outputs = {
      'agent-a': {
        type: 'json',
        content: {
          ...(renderProps.action as ActionDetails).outputs?.[action.agents[0]].content,
          stderr: '',
        },
      },
    };
    render();
    const accordionErrorButton = Array.from(
      renderResult.getByTestId('test-executeResponseOutput').querySelectorAll('.euiAccordion')
    )[1];
    expect(accordionErrorButton.textContent).toContain(
      `Execution error (truncated)${getEmptyValue()}`
    );
  });

  it('should not show execute output accordions when no output in action details', () => {
    (renderProps.action as ActionDetails).outputs = undefined;
    render();
    expect(renderResult.queryByTestId('test-executeResponseOutput')).toBeNull();
  });
});
