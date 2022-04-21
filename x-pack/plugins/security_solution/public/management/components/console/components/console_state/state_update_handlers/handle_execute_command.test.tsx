/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../../../mocks';
import type { ConsoleTestSetup } from '../../../mocks';
import { waitFor } from '@testing-library/react';
import { ConsoleProps } from '../../../types';

describe('When a Console command is entered by the user', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let commandServiceMock: ConsoleTestSetup['commandServiceMock'];
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ commandServiceMock, enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should display all available commands when `help` command is entered', async () => {
    render();
    enterCommand('help');

    expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();

    await waitFor(() => {
      expect(renderResult.getAllByTestId('test-commandList-command')).toHaveLength(
        // `+2` to account for builtin commands
        commandServiceMock.getCommandList().length + 2
      );
    });
  });

  it('should display custom help output when Command service has `getHelp()` defined', async () => {
    commandServiceMock.getHelp = async () => {
      return {
        result: <div data-test-subj="custom-help">{'help output'}</div>,
      };
    };
    render();
    enterCommand('help');

    await waitFor(() => {
      expect(renderResult.getByTestId('custom-help')).toBeTruthy();
    });
  });

  it('should clear the command output history when `clear` is entered', async () => {
    render();
    enterCommand('help');
    enterCommand('help');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(2);

    enterCommand('clear');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(0);
  });

  it('should show individual command help when `--help` option is used', async () => {
    render();
    enterCommand('cmd2 --help');

    await waitFor(() => expect(renderResult.getByTestId('test-commandUsage')).toBeTruthy());
  });

  it('should should custom command `--help` output when Command service defines `getCommandUsage()`', async () => {
    commandServiceMock.getCommandUsage = async () => {
      return {
        result: <div data-test-subj="cmd-help">{'command help  here'}</div>,
      };
    };
    render();
    enterCommand('cmd2 --help');

    await waitFor(() => expect(renderResult.getByTestId('cmd-help')).toBeTruthy());
  });

  it('should execute a command entered', async () => {
    render();
    enterCommand('cmd1');

    await waitFor(() => {
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
    });
  });

  it('should allow multiple of the same options if `allowMultiples` is `true`', async () => {
    render();
    enterCommand('cmd3 --foo one --foo two');

    await waitFor(() => {
      expect(renderResult.getByTestId('exec-output')).toBeTruthy();
    });
  });

  it('should show error if unknown command', async () => {
    render();
    enterCommand('foo-foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-unknownCommandError').textContent).toEqual(
        'Unknown commandFor a list of available command, enter: help'
      );
    });
  });

  it('should show error if options are used but command supports none', async () => {
    render();
    enterCommand('cmd1 --foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'command does not support any argumentsUsage:cmd1'
      );
    });
  });

  it('should show error if unknown option is used', async () => {
    render();
    enterCommand('cmd2 --file test --foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'unsupported argument: --fooUsage:cmd2 --file [--ext --bad]'
      );
    });
  });

  it('should show error if any required option is not set', async () => {
    render();
    enterCommand('cmd2 --ext one');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'missing required argument: --fileUsage:cmd2 --file [--ext --bad]'
      );
    });
  });

  it('should show error if argument is used more than one', async () => {
    render();
    enterCommand('cmd2 --file one --file two');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'argument can only be used once: --fileUsage:cmd2 --file [--ext --bad]'
      );
    });
  });

  it("should show error returned by the option's `validate()` callback", async () => {
    render();
    enterCommand('cmd2 --file one --bad foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'invalid argument value: --bad. This is a bad valueUsage:cmd2 --file [--ext --bad]'
      );
    });
  });

  it('should show error no options were provided, bug command requires some', async () => {
    render();
    enterCommand('cmd2');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'missing required arguments: --fileUsage:cmd2 --file [--ext --bad]'
      );
    });
  });

  it('should show error if all arguments are optional, but at least 1 must be defined', async () => {
    render();
    enterCommand('cmd4');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument').textContent).toEqual(
        'at least one argument must be usedUsage:cmd4  [--foo --bar]'
      );
    });
  });
});
