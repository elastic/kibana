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
  let commands: ConsoleTestSetup['commands'];
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    ({ commands, enterCommand } = testSetup);
    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should display all available commands when `help` command is entered', async () => {
    render();
    enterCommand('help');

    expect(renderResult.getByTestId('test-helpOutput')).toBeTruthy();

    await waitFor(() => {
      expect(renderResult.getAllByTestId('test-commandList-command')).toHaveLength(
        // `+2` to account for builtin commands
        commands.length + 2
      );
    });
  });

  it('should display custom help output when Command service has `getHelp()` defined', async () => {
    const HelpComponent: React.FunctionComponent = () => {
      return <div data-test-subj="custom-help">{'help output'}</div>;
    };
    render({ HelpComponent });
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
    const cmd2 = commands.find((command) => command.name === 'cmd2');

    if (cmd2) {
      cmd2.HelpComponent = () => {
        return <div data-test-subj="cmd-help">{'command help  here'}</div>;
      };
      cmd2.HelpComponent.displayName = 'HelpComponent';
    }

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
        'Unsupported text/command!The text you entered foo-foo is unsupported! Click  or type help for assistance.'
      );
    });
  });

  it('should show error if options are used but command supports none', async () => {
    render();
    enterCommand('cmd1 --foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Command does not support any arguments'
      );
    });
  });

  it('should show error if unknown (single) argument is used', async () => {
    render();
    enterCommand('cmd2 --file test --foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'The following cmd2 argument is not support by this command: --foo'
      );
    });
  });

  it('should show error if unknown (multiple) arguments are used', async () => {
    render();
    enterCommand('cmd2 --file test --foo --bar');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'The following cmd2 arguments are not support by this command: --foo, --bar'
      );
    });
  });

  it('should show error if any required option is not set', async () => {
    render();
    enterCommand('cmd2 --ext one');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Missing required argument: --file'
      );
    });
  });

  it('should show error if argument is used more than one', async () => {
    render();
    enterCommand('cmd2 --file one --file two');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Argument can only be used once: --file'
      );
    });
  });

  it("should show error returned by the option's `validate()` callback", async () => {
    render();
    enterCommand('cmd2 --file one --bad foo');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Invalid argument value: --bad. This is a bad value'
      );
    });
  });

  it('should show error no options were provided, bug command requires some', async () => {
    render();
    enterCommand('cmd2');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'Missing required arguments: --file'
      );
    });
  });

  it('should show error if all arguments are optional, but at least 1 must be defined', async () => {
    render();
    enterCommand('cmd4');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'At least one argument must be used'
      );
    });
  });

  it('should show error if command definition `validate()` callback return a message', async () => {
    const cmd1Definition = commands.find((command) => command.name === 'cmd1');

    if (!cmd1Definition) {
      throw new Error('cmd1 defintion not fount');
    }

    cmd1Definition.validate = () => 'command is invalid';

    render();
    enterCommand('cmd1');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
        'command is invalid'
      );
    });
  });
});
