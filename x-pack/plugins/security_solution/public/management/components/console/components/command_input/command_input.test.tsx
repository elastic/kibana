/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import type { ConsoleTestSetup } from '../../mocks';
import { getConsoleTestSetup } from '../../mocks';
import type { ConsoleProps } from '../../types';
import { INPUT_DEFAULT_PLACEHOLDER_TEXT } from '../console_state/state_update_handlers/handle_input_area_state';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('When entering data into the Console input', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let enterCommand: ConsoleTestSetup['enterCommand'];

  const showInputHistoryPopover = async () => {
    enterCommand('{ArrowUp}', { inputOnly: true, useKeyboard: true });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
    });

    const selectable = renderResult.getByTestId('test-inputHistorySelector');

    userEvent.tab({ focusTrap: selectable });
  };

  const getInputPlaceholderText = () => {
    return renderResult.getByTestId('test-inputPlaceholder').textContent;
  };

  const getUserInputText = () => {
    return renderResult.getByTestId('test-cmdInput-userTextInput').textContent;
  };

  const getFooterText = () => {
    return renderResult.getByTestId('test-footer').textContent;
  };

  const typeKeyboardKey = (key: string) => {
    enterCommand(key, { inputOnly: true, useKeyboard: true });
  };

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should display what the user is typing', () => {
    render();

    enterCommand('c', { inputOnly: true });
    expect(getUserInputText()).toEqual('c');

    enterCommand('m', { inputOnly: true });
    expect(getUserInputText()).toEqual('cm');
  });

  it('should repeat letters if the user holds letter key down on the keyboard', () => {
    render();
    enterCommand('{a>5/}', { inputOnly: true, useKeyboard: true });
    expect(getUserInputText()).toEqual('aaaaa');
  });

  it('should not display command key names in the input, when command keys are used', () => {
    render();
    enterCommand('{Meta>}', { inputOnly: true, useKeyboard: true });
    expect(getUserInputText()).toEqual('');
    enterCommand('{Shift>}A{/Shift}', { inputOnly: true, useKeyboard: true });
    expect(getUserInputText()).toEqual('A');
  });

  it('should display placeholder text when input area is blank', () => {
    render();

    expect(getInputPlaceholderText()).toEqual(INPUT_DEFAULT_PLACEHOLDER_TEXT);
  });

  it('should NOT display placeholder text if input area has text entered', () => {
    render();
    enterCommand('cm', { inputOnly: true });

    expect(getInputPlaceholderText()).toEqual('');
  });

  it('should NOT display any hint test in footer if nothing is displayed', () => {
    render();

    expect(getFooterText()?.trim()).toEqual('');
  });

  it('should display hint when a known command is typed', () => {
    render();
    enterCommand('cmd2 ', { inputOnly: true });

    expect(getFooterText()).toEqual('cmd2 --file [--ext --bad]');
  });

  it('should display hint when an unknown command is typed', () => {
    render();
    enterCommand('abc ', { inputOnly: true });

    expect(getFooterText()).toEqual('Unknown command abc');
    expect(renderResult.getByTestId('test-cmdInput-container').classList.contains('error')).toBe(
      true
    );
  });

  it('should show the arrow button as not disabled if input has text entered', () => {
    render();
    enterCommand('cm ', { inputOnly: true });

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).not.toBeDisabled();
  });

  it('should show the arrow button as disabled if input area is blank', () => {
    render();

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should show the arrow button as disabled if input has only whitespace entered and it is left to the cursor', () => {
    render();
    enterCommand(' ', { inputOnly: true });

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should show the arrow button as disabled if input has only whitespace entered and it is right to the cursor', () => {
    render();
    enterCommand(' ', { inputOnly: true });
    typeKeyboardKey('{ArrowLeft}');

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should execute correct command if arrow button is clicked', () => {
    render();
    enterCommand('isolate', { inputOnly: true });
    act(() => {
      renderResult.getByTestId('test-inputTextSubmitButton').click();
    });
    expect(renderResult.getByTestId('test-userCommandText').textContent).toEqual('isolate');
  });

  // FIXME:PT uncomment once task OLM task #4384 is implemented
  it.skip('should display the input history popover when UP key is pressed', async () => {
    render();
    await showInputHistoryPopover();

    expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
  });

  // FIXME:PT uncomment once task OLM task #4384 is implemented
  describe.skip('and when the command input history popover is opened', () => {
    const renderWithInputHistory = async (inputText: string = '') => {
      render();
      enterCommand('help');
      enterCommand('cmd2 --help');
      enterCommand('cmd1 --help');

      if (inputText) {
        enterCommand(inputText, { inputOnly: true });
      }

      await showInputHistoryPopover();
    };

    it('should clear the input area and show placeholder with first item that is focused', async () => {
      await renderWithInputHistory('one');

      expect(getUserInputText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });
    });

    it('should return original value to input and clear placeholder if popup is closed with no selection', async () => {
      await renderWithInputHistory('one');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });

      userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(getUserInputText()).toEqual('one');
      });
    });

    it('should add history item to the input area when selected and clear placeholder', async () => {
      await renderWithInputHistory('one');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });

      userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(getUserInputText()).toEqual('cmd1 --help');
      });
    });
  });

  describe('and keyboard special keys are pressed', () => {
    const getRightOfCursorText = () => {
      return renderResult.getByTestId('test-cmdInput-rightOfCursor').textContent;
    };

    beforeEach(() => {
      render();
      enterCommand('isolate', { inputOnly: true });
    });

    it('should backspace and delete last character', () => {
      typeKeyboardKey('{backspace}');
      expect(getUserInputText()).toEqual('isolat');
      expect(getRightOfCursorText()).toEqual('');
    });

    it('should clear the input if the user holds down the delete/backspace key', () => {
      typeKeyboardKey('{backspace>7/}');
      expect(getUserInputText()).toEqual('');
    });

    it('should move cursor to the left', () => {
      typeKeyboardKey('{ArrowLeft}');
      typeKeyboardKey('{ArrowLeft}');
      expect(getUserInputText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');
    });

    it('should move cursor to the right', () => {
      typeKeyboardKey('{ArrowLeft}');
      typeKeyboardKey('{ArrowLeft}');
      expect(getUserInputText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');

      typeKeyboardKey('{ArrowRight}');
      expect(getUserInputText()).toEqual('isolat');
      expect(getRightOfCursorText()).toEqual('e');
    });

    it('should move cursor to the beginning', () => {
      typeKeyboardKey('{Home}');
      expect(getUserInputText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('isolate');
    });

    it('should should move cursor to the end', () => {
      typeKeyboardKey('{Home}');
      expect(getUserInputText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('isolate');

      typeKeyboardKey('{End}');
      expect(getUserInputText()).toEqual('isolate');
      expect(getRightOfCursorText()).toEqual('');
    });

    it('should delete text', () => {
      typeKeyboardKey('{Home}');
      typeKeyboardKey('{Delete}');
      expect(getUserInputText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('solate');
    });

    it('should execute the correct command if Enter is pressed when cursor is between input', () => {
      typeKeyboardKey('{ArrowLeft}');
      typeKeyboardKey('{ArrowLeft}');

      expect(getUserInputText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');

      typeKeyboardKey('{enter}');

      expect(renderResult.getByTestId('test-userCommandText').textContent).toEqual('isolate');
    });

    it('should show correct hint when cursor is between input', () => {
      typeKeyboardKey('{Enter}');
      typeKeyboardKey('cmd1 '); // space after command trigger command look for hint
      typeKeyboardKey('{Home}');
      typeKeyboardKey('{ArrowRight}');

      expect(getUserInputText()).toEqual('c');
      expect(getRightOfCursorText()).toEqual('md1 ');

      expect(getFooterText()).toEqual('Hit enter to execute');
    });

    // FIXME:PT uncomment once task OLM task #4384 is implemented
    it.skip('should return original cursor position if input history is closed with no selection', async () => {
      typeKeyboardKey('{Enter}'); // add `isolate` to the input history

      typeKeyboardKey('release');
      typeKeyboardKey('{Home}');
      typeKeyboardKey('{ArrowRight}');

      expect(getUserInputText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');

      await showInputHistoryPopover();

      expect(getUserInputText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('isolate');
      });

      userEvent.keyboard('{Escape}');

      expect(getUserInputText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');
    });

    // FIXME:PT uncomment once task OLM task #4384 is implemented
    it.skip('should reset cursor position to default (at end) if a selection is done from input history', async () => {
      typeKeyboardKey('{Enter}'); // add `isolate` to the input history

      typeKeyboardKey('release');
      typeKeyboardKey('{Home}');
      typeKeyboardKey('{ArrowRight}');

      expect(getUserInputText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');

      await showInputHistoryPopover();

      expect(getUserInputText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('isolate');
      });

      userEvent.keyboard('{Enter}');

      expect(getUserInputText()).toEqual('isolate');
      expect(getRightOfCursorText()).toEqual('');
    });
  });
});
