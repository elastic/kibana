/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../../../mocks';
import type { ConsoleTestSetup } from '../../../mocks';
import type { ConsoleProps, CommandArgDefinition, CommandDefinition } from '../../../types';
import { executionTranslations } from './translations';

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

  it('should clear the command output history when `clear` is entered', async () => {
    render();
    await enterCommand('help');
    await enterCommand('help');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(2);

    await enterCommand('clear');

    expect(renderResult.getByTestId('test-historyOutput').childElementCount).toBe(0);
  });

  it('should show individual command help when `--help` option is used', async () => {
    render();
    await enterCommand('cmd2 --help');

    expect(renderResult.getByTestId('test-commandUsage')).toBeTruthy();
  });

  it('should render custom command `--help` output when Command service defines `getCommandUsage()`', async () => {
    const cmd2 = commands.find((command) => command.name === 'cmd2');

    if (cmd2) {
      cmd2.HelpComponent = () => {
        return <div data-test-subj="cmd-help">{'command help  here'}</div>;
      };
      cmd2.HelpComponent.displayName = 'HelpComponent';
    }

    render();
    await enterCommand('cmd2 --help');

    expect(renderResult.getByTestId('cmd-help')).toBeTruthy();
  });

  it('should execute a command entered', async () => {
    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should allow multiple of the same options if `allowMultiples` is `true`', async () => {
    render();
    await enterCommand('cmd3 --foo one --foo two');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should show error if unknown command', async () => {
    render();
    await enterCommand('foo-foo');

    expect(renderResult.getByTestId('test-unknownCommandError').textContent).toEqual(
      'Unsupported text/commandThe text you entered foo-foo is unsupported! Click  Help or type help for assistance.'
    );
  });

  it('should show error if options are used but command supports none', async () => {
    render();
    await enterCommand('cmd1 --foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Command does not support any arguments'
    );
  });

  it('should show error if unknown (single) argument is used', async () => {
    render();
    await enterCommand('cmd2 --file test --foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'The following cmd2 argument is not supported by this command: --foo'
    );
  });

  it('should show error if unknown (multiple) arguments are used', async () => {
    render();
    await enterCommand('cmd2 --file test --foo --bar');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'The following cmd2 arguments are not supported by this command: --foo, --bar'
    );
  });

  it('should show error if unknown arguments are used along with the `--help` argument', async () => {
    render();
    await enterCommand('cmd2 one two three --help');

    expect(renderResult.getByTestId('test-badArgument').textContent).toMatch(
      /Unsupported argument/
    );
  });

  it('should show error if values are given to the `--help` argument', async () => {
    render();
    await enterCommand('cmd2 --help one --help');

    expect(renderResult.getByTestId('test-badArgument').textContent).toMatch(
      /Unsupported argument/
    );
  });

  it('should show error if any required option is not set', async () => {
    render();
    await enterCommand('cmd2 --ext one');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required argument: --file'
    );
  });

  it('should show error if argument is used more than once', async () => {
    render();
    await enterCommand('cmd2 --file one --file two');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --file'
    );
  });

  it("should show error returned by the option's `validate()` callback", async () => {
    render();
    await enterCommand('cmd2 --file one --bad foo');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --bad. This is a bad value'
    );
  });

  it('should show error if no options were provided, but command requires some', async () => {
    render();
    await enterCommand('cmd2');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required arguments: --file'
    );
  });

  it('should show error if all arguments are optional, but at least 1 must be defined', async () => {
    render();
    await enterCommand('cmd4');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'At least one argument must be used'
    );
  });

  it("should show error if command's definition `validate()` callback returns a message", async () => {
    const cmd1Definition = commands.find((command) => command.name === 'cmd1');

    if (!cmd1Definition) {
      throw new Error('cmd1 definition not found');
    }

    cmd1Definition.validate = () => 'command is invalid';

    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'command is invalid'
    );
  });

  it("should show error for --help if command's definition `validate()` callback returns a message", async () => {
    const cmd1Definition = commands.find((command) => command.name === 'cmd1');

    if (!cmd1Definition) {
      throw new Error('cmd1 definition not found');
    }

    cmd1Definition.validate = () => 'command is invalid';

    render();
    await enterCommand('cmd1 --help');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'command is invalid'
    );
  });

  it('should show error no options were provided, but has exclusive or arguments', async () => {
    render();
    await enterCommand('cmd6');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command supports only one of the following arguments: --foo, --bar'
    );
  });

  it('should show error when it has multiple exclusive arguments', async () => {
    render();
    await enterCommand('cmd6 --foo 234 --bar 123');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command supports only one of the following arguments: --foo, --bar'
    );
  });

  it('should show success when one exclusive argument is used', async () => {
    render();
    await enterCommand('cmd6 --foo 234');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  it('should show success when the other exclusive argument is used', async () => {
    render();
    await enterCommand('cmd6 --bar 234');

    expect(renderResult.getByTestId('exec-output')).toBeTruthy();
  });

  describe('Argument value validators', () => {
    let command: CommandDefinition;

    const setValidation = (validation: CommandArgDefinition['mustHaveValue']): void => {
      command.args!.foo.mustHaveValue = validation;
    };

    beforeEach(() => {
      command = commands.find(({ name }) => name === 'cmd3')!;
      command.args!.foo.allowMultiples = false;
    });

    it('should validate argument with `mustHaveValue=non-empty-string', async () => {
      setValidation('non-empty-string');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo=""');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustHaveValue('foo')
      );
    });

    it('should validate argument with `mustHaveValue=truthy', async () => {
      setValidation('truthy');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo=""');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustHaveValue('foo')
      );
    });

    it('should validate argument with `mustHaveValue=number', async () => {
      setValidation('number');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo="hi"');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustBeNumber('foo')
      );
    });

    it('should validate argument with `mustHaveValue=number-greater-than-zero', async () => {
      setValidation('number-greater-than-zero');
      const { getByTestId } = render();
      await enterCommand('cmd3 --foo="0"');

      expect(getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustBeGreaterThanZero('foo')
      );
    });
  });
});
