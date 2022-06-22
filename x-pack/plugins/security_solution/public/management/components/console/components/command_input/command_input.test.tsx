/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { ConsoleTestSetup, getConsoleTestSetup } from '../../mocks';
import { ConsoleProps } from '../../types';

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

  it.todo('should display placeholder text when input area is blank');

  it.todo('should NOT display placeholder text if input area has text entered');

  it.todo('should display hint when a known command is typed');

  it.todo('should display hint when an unknown command is typed');

  describe('and the UP arrow is pressed', () => {
    it.todo('should display the input history popover');

    it.todo('should clear the input area and show placeholder with first item that is focused');

    it.todo(
      'should return original value to input and clear placeholder if popup is closed with no selection'
    );

    it.todo('should add history item to the input area when selected and clear placeholder');
  });
});
