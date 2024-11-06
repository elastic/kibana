/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import type { ConsoleTestSetup } from '../../../mocks';
import { getConsoleTestSetup } from '../../../mocks';
import type { ConsoleProps } from '../../../types';
import { INPUT_DEFAULT_PLACEHOLDER_TEXT } from '../../console_state/state_update_handlers/handle_input_area_state';
import { screen, waitFor, createEvent, fireEvent } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { NO_HISTORY_EMPTY_MESSAGE } from '../components/command_input_history';
import { UP_ARROW_ACCESS_HISTORY_HINT } from '../hooks/use_input_hints';

// TODO This tests need revisting, there are problems with `enterComment` after the
// upgrade to user-event v14 https://github.com/elastic/kibana/pull/189949
describe.skip('When entering data into the Console input', () => {
  let user: UserEvent;
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let enterCommand: ConsoleTestSetup['enterCommand'];

  const showInputHistoryPopover = async () => {
    await enterCommand('{ArrowUp}', { inputOnly: true, useKeyboard: true });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
    });

    await user.tab();
  };

  const getInputPlaceholderText = () => {
    return renderResult.getByTestId('test-inputPlaceholder').textContent;
  };

  const getLeftOfCursorText = () => {
    return renderResult.getByTestId('test-cmdInput-leftOfCursor').textContent;
  };

  const getRightOfCursorText = () => {
    return renderResult.getByTestId('test-cmdInput-rightOfCursor').textContent;
  };

  const getFooterText = () => {
    return renderResult.getByTestId('test-footer').textContent;
  };

  const typeKeyboardKey = async (key: string) => {
    await enterCommand(key, { inputOnly: true, useKeyboard: true });
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    const testSetup = getConsoleTestSetup();

    ({ enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display what the user is typing', async () => {
    render();

    await enterCommand('c', { inputOnly: true });
    expect(getLeftOfCursorText()).toEqual('c');

    await enterCommand('m', { inputOnly: true });
    expect(getLeftOfCursorText()).toEqual('cm');
  });

  it('should repeat letters if the user holds letter key down on the keyboard', async () => {
    render();
    await enterCommand('{a>5/}', { inputOnly: true, useKeyboard: true });
    expect(getLeftOfCursorText()).toEqual('aaaaa');
  });

  it('should not display command key names in the input, when command keys are used', async () => {
    render();
    await enterCommand('{Meta>}', { inputOnly: true, useKeyboard: true });
    expect(getLeftOfCursorText()).toEqual('');
    await enterCommand('{Shift>}A{/Shift}', { inputOnly: true, useKeyboard: true });
    expect(getLeftOfCursorText()).toEqual('A');
  });

  it('should display placeholder text when input area is blank', () => {
    render();

    expect(getInputPlaceholderText()).toEqual(INPUT_DEFAULT_PLACEHOLDER_TEXT);
  });

  it('should NOT display placeholder text if input area has text entered', async () => {
    render();
    await enterCommand('cm', { inputOnly: true });

    expect(renderResult.queryByTestId('test-inputPlaceholder')).toBeNull();
  });

  it('should display default hint when nothing is typed into the command input area', () => {
    render();

    expect(getFooterText()?.trim()).toBe(UP_ARROW_ACCESS_HISTORY_HINT);
  });

  it('should display hint when a known command is typed', async () => {
    render();
    await enterCommand('cmd2 ', { inputOnly: true });

    expect(getFooterText()).toEqual('cmd2 --file [--ext --bad]');
  });

  it('should display hint when an unknown command is typed', async () => {
    render();
    await enterCommand('abc ', { inputOnly: true });

    expect(getFooterText()).toEqual('Unknown command abc');
    expect(renderResult.getByTestId('test-cmdInput-container').classList.contains('error')).toBe(
      true
    );
  });

  it('should show the arrow button as not disabled if input has text entered', async () => {
    render();
    await enterCommand('cm ', { inputOnly: true });

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).not.toBeDisabled();
  });

  it('should show the arrow button as disabled if input area is blank', () => {
    render();

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should show the arrow button as disabled if input has only whitespace entered and it is left to the cursor', async () => {
    render();
    await enterCommand(' ', { inputOnly: true });

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should show the arrow button as disabled if input has only whitespace entered and it is right to the cursor', async () => {
    render();
    await enterCommand(' ', { inputOnly: true });
    await typeKeyboardKey('{ArrowLeft}');

    const arrowButton = renderResult.getByTestId('test-inputTextSubmitButton');
    expect(arrowButton).toBeDisabled();
  });

  it('should execute correct command if arrow button is clicked', async () => {
    render();
    await enterCommand('isolate', { inputOnly: true });
    await user.click(renderResult.getByTestId('test-inputTextSubmitButton'));
    expect(renderResult.getByTestId('test-userCommandText').textContent).toEqual('isolate');
  });

  it('should display the input history popover when UP key is pressed', async () => {
    render();
    await showInputHistoryPopover();

    expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
  });

  it('should hide the history popover if user clicks back on input area', async () => {
    render();
    await showInputHistoryPopover();
    await user.click(renderResult.getByTestId('test-keyCapture-input'));

    await waitFor(() => {
      expect(renderResult.queryByTestId('test-inputHistorySelector')).toBeNull();
    });
  });

  describe('and when the command input history popover is opened', () => {
    const renderWithInputHistory = async (inputText: string = '') => {
      render();
      await enterCommand('help');
      await enterCommand('cmd2 --help');
      await enterCommand('cmd1 --help');

      if (inputText) {
        enterCommand(inputText, { inputOnly: true });
      }

      await showInputHistoryPopover();
    };

    it('should clear the input area and show placeholder with first item that is focused', async () => {
      await renderWithInputHistory('one');

      expect(getLeftOfCursorText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });
    });

    it('should return original value to input and clear placeholder if popup is closed with no selection', async () => {
      await renderWithInputHistory('one');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(getLeftOfCursorText()).toEqual('one');
      });
    });

    it('should add history item to the input area when selected and clear placeholder', async () => {
      await renderWithInputHistory('one');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('cmd1 --help');
      });

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(getLeftOfCursorText()).toEqual('cmd1 --help');
      });
    });

    it('should show confirm dialog when Clear history button is clicked', async () => {
      await renderWithInputHistory('one');

      await user.click(renderResult.getByTestId('test-clearInputHistoryButton'));

      await waitFor(() => {
        expect(renderResult.getByTestId('confirmModalTitleText'));
      });
    });

    describe('and clear history confirm dialog is displayed', () => {
      beforeEach(async () => {
        await renderWithInputHistory('one');
        await user.click(renderResult.getByTestId('test-clearInputHistoryButton'));
        await waitFor(() => {
          expect(renderResult.getByTestId('confirmModalTitleText'));
        });
      });

      it('should close the confirm modal if Cancel button is clicked', async () => {
        await user.click(renderResult.getByTestId('confirmModalCancelButton'));

        await waitFor(() => {
          expect(renderResult.queryByTestId('confirmModalTitleText')).toBeNull();
          expect(renderResult.getByTestId('test-inputHistorySelector')).not.toBeNull();
        });
      });

      it('should clear all input history if Clear button is clicked', async () => {
        await user.click(renderResult.getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(renderResult.getByTestId('euiSelectableMessage')).toHaveTextContent(
            NO_HISTORY_EMPTY_MESSAGE
          );
        });
      });
    });
  });

  describe('and keyboard special keys are pressed', () => {
    const selectLeftOfCursorText = () => {
      // Select text to the left of the cursor
      const selection = window.getSelection();
      const range = document.createRange();

      // Create a new range with the content that is to the left of the cursor
      range.selectNodeContents(renderResult.getByTestId('test-cmdInput-leftOfCursor'));
      selection!.removeAllRanges();
      selection!.addRange(range);
    };

    beforeEach(async () => {
      render();
      await enterCommand('isolate', { inputOnly: true });
    });

    it('should backspace and delete last character', async () => {
      await typeKeyboardKey('{backspace}');
      expect(getLeftOfCursorText()).toEqual('isolat');
      expect(getRightOfCursorText()).toEqual('');
    });

    it('should clear the input if the user holds down the delete/backspace key', async () => {
      await typeKeyboardKey('{backspace>7/}');
      expect(getLeftOfCursorText()).toEqual('');
    });

    it('should move cursor to the left', async () => {
      await typeKeyboardKey('{ArrowLeft}');
      await typeKeyboardKey('{ArrowLeft}');
      expect(getLeftOfCursorText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');
    });

    it('should move cursor to the right', async () => {
      await typeKeyboardKey('{ArrowLeft}');
      await typeKeyboardKey('{ArrowLeft}');
      expect(getLeftOfCursorText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');

      await typeKeyboardKey('{ArrowRight}');
      expect(getLeftOfCursorText()).toEqual('isolat');
      expect(getRightOfCursorText()).toEqual('e');
    });

    it('should move cursor to the beginning', async () => {
      await typeKeyboardKey('{Home}');
      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('isolate');
    });

    it('should should move cursor to the end', async () => {
      await typeKeyboardKey('{Home}');
      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('isolate');

      await typeKeyboardKey('{End}');
      expect(getLeftOfCursorText()).toEqual('isolate');
      expect(getRightOfCursorText()).toEqual('');
    });

    it('should delete text', async () => {
      await typeKeyboardKey('{Home}');
      await typeKeyboardKey('{Delete}');
      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('solate');
    });

    it('should execute the correct command if Enter is pressed when cursor is between input', async () => {
      await typeKeyboardKey('{ArrowLeft}');
      await typeKeyboardKey('{ArrowLeft}');

      expect(getLeftOfCursorText()).toEqual('isola');
      expect(getRightOfCursorText()).toEqual('te');

      await typeKeyboardKey('{enter}');

      expect(renderResult.getByTestId('test-userCommandText').textContent).toEqual('isolate');
    });

    it('should show correct hint when cursor is between input', async () => {
      await typeKeyboardKey('{Enter}');
      await typeKeyboardKey('cmd1 '); // space after command trigger command look for hint
      await typeKeyboardKey('{Home}');
      await typeKeyboardKey('{ArrowRight}');

      expect(getLeftOfCursorText()).toEqual('c');
      expect(getRightOfCursorText()).toEqual('md1 ');

      expect(getFooterText()).toEqual('Hit enter to execute');
    });

    it('should replace selected text with key pressed', async () => {
      await typeKeyboardKey('{ArrowLeft>3/}'); // Press left arrow for 3 times
      selectLeftOfCursorText();
      await typeKeyboardKey('a');

      expect(getLeftOfCursorText()).toEqual('a');
      expect(getRightOfCursorText()).toEqual('ate');
    });

    it('should replace selected text with content pasted', async () => {
      await typeKeyboardKey('{ArrowLeft>3/}'); // Press left arrow for 3 times
      selectLeftOfCursorText();

      const inputCaptureEle = renderResult.getByTestId('test-keyCapture-input');

      // Mocking the `DataTransfer` class since its not available in Jest test setup
      const clipboardData = {
        getData: () => 'I pasted this',
      } as unknown as DataTransfer;

      const pasteEvent = createEvent.paste(inputCaptureEle, {
        clipboardData,
      });

      fireEvent(inputCaptureEle, pasteEvent);

      expect(getLeftOfCursorText()).toEqual('I pasted this');
      expect(getRightOfCursorText()).toEqual('ate');
    });

    it('should delete selected text when delete key is pressed', async () => {
      await typeKeyboardKey('{ArrowLeft>3/}'); // Press left arrow for 3 times
      selectLeftOfCursorText();
      await typeKeyboardKey('{Delete}');

      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('ate');
    });

    it('should select all text when ctrl or cmd + a is pressed', async () => {
      await typeKeyboardKey('{ctrl>}a{/ctrl}');
      let selection = window.getSelection();
      expect(selection!.toString()).toEqual('isolate');

      selection!.removeAllRanges();

      await typeKeyboardKey('{meta>}a{/meta}');
      selection = window.getSelection();
      expect(selection!.toString()).toEqual('isolate');
    });

    it('should return original cursor position if input history is closed with no selection', async () => {
      await typeKeyboardKey('{Enter}'); // add `isolate` to the input history

      await typeKeyboardKey('release');
      await typeKeyboardKey('{Home}');
      await typeKeyboardKey('{ArrowRight}');

      expect(getLeftOfCursorText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');

      await showInputHistoryPopover();

      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('isolate');
      });

      await user.keyboard('{Escape}');

      expect(getLeftOfCursorText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');
    });

    it('should reset cursor position to default (at end) if a selection is done from input history', async () => {
      await typeKeyboardKey('{Enter}'); // add `isolate` to the input history

      await typeKeyboardKey('release');
      await typeKeyboardKey('{Home}');
      await typeKeyboardKey('{ArrowRight}');

      expect(getLeftOfCursorText()).toEqual('r');
      expect(getRightOfCursorText()).toEqual('elease');

      await showInputHistoryPopover();

      expect(getLeftOfCursorText()).toEqual('');
      expect(getRightOfCursorText()).toEqual('');

      await waitFor(() => {
        expect(getInputPlaceholderText()).toEqual('isolate');
      });

      await user.keyboard('{Enter}');

      expect(getLeftOfCursorText()).toEqual('isolate');
      expect(getRightOfCursorText()).toEqual('');
    });
  });

  describe('and a command argument has a value SelectorComponent defined', () => {
    it('should insert Selector component when argument name is used', async () => {
      render();
      await enterCommand('cmd7 --foo', { inputOnly: true });

      expect(getLeftOfCursorText()).toEqual('cmd7 --foo=foo[0]: foo selected');
    });

    it('should not insert Selector component if argument name is not a whole word', async () => {
      render();
      await enterCommand('cmd7 --foobar', { inputOnly: true });

      expect(getLeftOfCursorText()).toEqual('cmd7 --foobar');
    });

    it('should not insert Selector component if argument name is not a whole word while cursor is between the argument name', async () => {
      render();
      await enterCommand('cmd7 --fooX', { inputOnly: true });
      await typeKeyboardKey('{ArrowLeft}');

      expect(getLeftOfCursorText()).toEqual('cmd7 --foo');
      expect(getRightOfCursorText()).toEqual('X');
    });

    it('should support using argument multiple times (allowMultiples: true)', async () => {
      render();
      await enterCommand('cmd7 --foo --foo', { inputOnly: true });

      expect(getLeftOfCursorText()).toEqual(
        'cmd7 --foo=foo[0]: foo selected --foo=foo[1]: foo selected'
      );
    });

    it(`should remove entire argument if BACKSPACE key is pressed`, async () => {
      render();
      await enterCommand('cmd7 --foo', { inputOnly: true });
      await typeKeyboardKey('{backspace}');

      expect(getLeftOfCursorText()).toEqual('cmd7 ');
    });

    it(`should remove entire argument if DELETE key is pressed`, async () => {
      render();
      await enterCommand('cmd7 --foo', { inputOnly: true });
      await typeKeyboardKey('{ArrowLeft}');
      await typeKeyboardKey('{Delete}');

      screen.debug();

      expect(getLeftOfCursorText()).toEqual('cmd7 ');
    });
  });
});
