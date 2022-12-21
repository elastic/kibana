/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { getConsoleTestSetup } from './mocks';
import userEvent from '@testing-library/user-event';
import type { ConsoleProps } from './types';

describe('When using Console component', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should render console', () => {
    render();

    expect(renderResult.getByTestId('test')).toBeTruthy();
  });

  it('should display prompt given on input', () => {
    render({ prompt: 'MY PROMPT>>' });

    expect(renderResult.getByTestId('test-cmdInput-prompt').textContent).toEqual('MY PROMPT>>');
  });

  it('should focus on input area when it gains focus', () => {
    render();
    userEvent.click(renderResult.getByTestId('test-mainPanel-inputArea'));

    expect(document.activeElement!.classList.contains('invisible-input')).toBe(true);
  });
});
