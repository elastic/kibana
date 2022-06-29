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
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('When entering data into the Console input', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let enterCommand: ConsoleTestSetup['enterCommand'];
  let typeText: ConsoleTestSetup['typeText'];

  const showInputHistoryPopover = () => {
    typeText('{ArrowUp}');
  };

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
      'cmd2 --file [--ext --bad]'
    );
  });

  it('should display hint when an unknown command is typed', () => {
    render();
    enterCommand('abc ', { inputOnly: true });

    expect(renderResult.getByTestId('test-footer').textContent).toEqual(
      'Unknown command abc'
    );
  });

  it('should display a custom hint when provided by a command', () => {
    render();
    enterCommand('cmd6 ', { inputOnly: true });

    expect(renderResult.getByTestId('test-footer').textContent).toEqual(
      'Enter --foo to execute Ex: [cmd --foo 123]'
    );
  });

  it('should display the input history popover when UP key is pressed', async () => {
    render();
    showInputHistoryPopover();

    expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
  });

  describe('and when the command input history popover is opened', () => {
    const renderWithInputHistory = (inputText: string = '') => {
      render();
      enterCommand('cmd1 --help');
      enterCommand('help');
      enterCommand('cmd2 --help');
      enterCommand('clear');

      if (inputText) {
        enterCommand(inputText, { inputOnly: true });
      }

      showInputHistoryPopover();
    };

    it('should clear the input area and show placeholder with first item that is focused', async () => {
      renderWithInputHistory('one');

      expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual('');

      waitFor(() => {
        expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual(
          'cmd1 --help'
        );
      });
    });

    it('should return original value to input and clear placeholder if popup is closed with no selection', async () => {
      renderWithInputHistory('one');

      waitFor(() => {
        expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual(
          'cmd1 --help'
        );
      });

      userEvent.keyboard('{Escape}');

      waitFor(() => {
        expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual('one');
      });
    });

    it('should add history item to the input area when selected and clear placeholder', async () => {
      renderWithInputHistory('one');

      waitFor(() => {
        expect(renderResult.getByTestId('test-inputPlaceholder').textContent).toEqual(
          'cmd1 --help'
        );
      });

      userEvent.keyboard('{Enter}');

      waitFor(() => {
        expect(renderResult.getByTestId('test-cmdInput-userTextInput').textContent).toEqual(
          'cmd1 --help'
        );
      });
    });
  });
});
