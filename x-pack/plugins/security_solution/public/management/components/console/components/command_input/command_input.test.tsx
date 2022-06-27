/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { ConsoleTestSetup, getConsoleTestSetup } from '../../mocks';
import { ConsoleProps } from '../../types';
import { INPUT_DEFAULT_PLACEHOLDER_TEXT } from '../console_state/state_update_handlers/handle_input_area_state';

describe('When entering data into the Console input', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let enterCommand: ConsoleTestSetup['enterCommand'];
  let typeText: ConsoleTestSetup['typeText'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ enterCommand, typeText } = testSetup);
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

  it('should display placeholder text when input area is blank', () => {
    render();

    expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual(
      INPUT_DEFAULT_PLACEHOLDER_TEXT
    );
  });

  it('should NOT display placeholder text if input area has text entered', () => {
    render();
    enterCommand('cm', { inputOnly: true });

    expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual('');
  });

  it('should NOT display any hint test in footer if nothing is displayed', () => {
    render();

    expect(renderResult.getByTestId('test-footer').textContent?.trim()).toEqual('');
  });

  it('should display hint when a known command is typed', () => {
    render();
    enterCommand('cmd2 ', { inputOnly: true });

    expect(renderResult.getByTestId('test-footer').textContent).toEqual(
      'Hint: cmd2 --file [--ext --bad]'
    );
  });

  it('should display hint when an unknown command is typed', () => {
    render();
    enterCommand('abc ', { inputOnly: true });

    expect(renderResult.getByTestId('test-footer').textContent).toEqual(
      'Hint: unknown command abc'
    );
  });

  it('should display the input history popover when UP key is pressed', async () => {
    render();
    typeText('{ArrowUp}');

    expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
  });

  describe('and when the command input history popver is opened', () => {
    it.todo('should clear the input area and show placeholder with first item that is focused');

    it.todo(
      'should return original value to input and clear placeholder if popup is closed with no selection'
    );

    it.todo('should add history item to the input area when selected and clear placeholder');
  });
});
