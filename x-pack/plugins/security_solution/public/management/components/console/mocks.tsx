/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { Console } from './console';
import type { Command, CommandServiceInterface, ConsoleProps } from './types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { CommandDefinition } from './types';

export interface ConsoleTestSetup {
  renderConsole(props?: Partial<ConsoleProps>): ReturnType<AppContextTestRender['render']>;

  commandServiceMock: jest.Mocked<CommandServiceInterface>;

  enterCommand(
    cmd: string,
    options?: Partial<{
      /** If true, the ENTER key will not be pressed */
      inputOnly: boolean;
      /**
       * if true, then the keyboard keys will be used to send the command.
       * Use this if wanting ot press keyboard keys other than letter/punctuation
       */
      useKeyboard: boolean;
    }>
  ): void;
}

/**
 * Finds the console in the Render Result and enters the command provided
 * @param renderResult
 * @param cmd
 * @param inputOnly
 * @param useKeyboard
 * @param dataTestSubj
 */
export const enterConsoleCommand = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  cmd: string,
  {
    inputOnly = false,
    useKeyboard = false,
    dataTestSubj = 'test',
  }: Partial<{ inputOnly: boolean; useKeyboard: boolean; dataTestSubj: string }> = {}
): void => {
  const keyCaptureInput = renderResult.getByTestId(`${dataTestSubj}-keyCapture-input`);

  act(() => {
    if (useKeyboard) {
      userEvent.click(keyCaptureInput);
      userEvent.keyboard(cmd);
    } else {
      userEvent.type(keyCaptureInput, cmd);
    }

    if (!inputOnly) {
      userEvent.keyboard('{enter}');
    }
  });
};

export const getConsoleTestSetup = (): ConsoleTestSetup => {
  const mockedContext = createAppRootMockRenderer();

  let renderResult: ReturnType<AppContextTestRender['render']>;

  const commandServiceMock = getCommandServiceMock();

  const renderConsole: ConsoleTestSetup['renderConsole'] = ({
    prompt = '$$>',
    commandService = commandServiceMock,
    'data-test-subj': dataTestSubj = 'test',
    ...others
  } = {}) => {
    if (commandService !== commandServiceMock) {
      throw new Error('Must use CommandService provided by test setup');
    }

    return (renderResult = mockedContext.render(
      <Console
        prompt={prompt}
        commandService={commandService}
        data-test-subj={dataTestSubj}
        {...others}
      />
    ));
  };

  const enterCommand: ConsoleTestSetup['enterCommand'] = (cmd, options = {}) => {
    enterConsoleCommand(renderResult, cmd, options);
  };

  return {
    renderConsole,
    commandServiceMock,
    enterCommand,
  };
};

export const getCommandServiceMock = (): jest.Mocked<CommandServiceInterface> => {
  return {
    getCommandList: jest.fn(() => {
      const commands: CommandDefinition[] = [
        {
          name: 'cmd1',
          about: 'a command with no options',
        },
        {
          name: 'cmd2',
          about: 'runs cmd 2',
          args: {
            file: {
              about: 'Includes file in the run',
              required: true,
              allowMultiples: false,
              validate: () => {
                return true;
              },
            },
            ext: {
              about: 'optional argument',
              required: false,
              allowMultiples: false,
            },
            bad: {
              about: 'will fail validation',
              required: false,
              allowMultiples: false,
              validate: () => 'This is a bad value',
            },
          },
        },
        {
          name: 'cmd3',
          about: 'allows argument to be used multiple times',
          args: {
            foo: {
              about: 'foo stuff',
              required: true,
              allowMultiples: true,
            },
          },
        },
        {
          name: 'cmd4',
          about: 'all options optinal, but at least one is required',
          mustHaveArgs: true,
          args: {
            foo: {
              about: 'foo stuff',
              required: false,
              allowMultiples: true,
            },
            bar: {
              about: 'bar stuff',
              required: false,
              allowMultiples: true,
            },
          },
        },
      ];

      return commands;
    }),

    executeCommand: jest.fn(async (command: Command) => {
      await new Promise((r) => setTimeout(r, 1));

      return {
        result: (
          <div data-test-subj="exec-output">
            <div data-test-subj="exec-output-cmdName">{`${command.commandDefinition.name}`}</div>
            <div data-test-subj="exec-output-userInput">{`command input: ${command.input}`}</div>
            <EuiCode data-test-subj="exec-output-argsJson">
              {JSON.stringify(command.args, null, 2)}
            </EuiCode>
          </div>
        ),
      };
    }),
  };
};
