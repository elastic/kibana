/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsoleProps } from '../../console';
import { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { ConsoleTestSetup, getConsoleTestSetup } from '../../mocks';

describe('When entering data into the Console input', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should display what the user is typing', () => {
    render();

    enterCommand('c', { inputOnly: true });
    expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual('c');

    enterCommand('m', { inputOnly: true });
    expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual('cm');
  });

  it('should delete last character when BACKSPACE is pressed', () => {
    render();

    enterCommand('cm', { inputOnly: true });
    expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual('cm');

    enterCommand('{backspace}', { inputOnly: true, useKeyboard: true });
    expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual('c');
  });
});
