/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { Console } from './console';
import type { ConsoleProps } from './console';
import type { Command, CommandServiceInterface } from './types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';

export interface ConsoleTestSetup {
  renderConsole(props?: Partial<ConsoleProps>): ReturnType<AppContextTestRender['render']>;
}

export const getConsoleTestSetup = () => {
  const mockedContext = createAppRootMockRenderer();

  // let renderResult: ReturnType<AppContextTestRender['render']>;
  const renderConsole: ConsoleTestSetup['renderConsole'] = ({
    prompt = '$$>',
    consoleService = getCommandServiceMock(),
    'data-test-subj': dataTestSubj = 'test',
    ...others
  } = {}) => {
    return mockedContext.render(
      <Console
        prompt={prompt}
        consoleService={consoleService}
        data-test-subj={dataTestSubj}
        {...others}
      />
    );
  };

  return {
    renderConsole,
  };
};

export const getCommandServiceMock = (): jest.Mocked<CommandServiceInterface> => {
  return {
    getCommandList: jest.fn(() => {
      return [
        {
          name: 'cmd1',
          about: 'Runs cmd1',
        },
        {
          name: 'cmd2',
          about: 'runs cmd 2',
          args: {
            file: {
              required: true,
              allowMultiples: false,
              about: 'Includes file in the run',
              validate: () => {
                return true;
              },
            },
            bad: {
              required: false,
              allowMultiples: false,
              about: 'will fail validation',
              validate: () => 'This is a bad value',
            },
          },
        },
      ];
    }),

    executeCommand: jest.fn(async (command: Command) => {
      await new Promise((r) => setTimeout(r, 1));

      return {
        result: (
          <div data-test-subj="exec-output">
            <div data-test-subj="exec-output.cmdName">{`${command.commandDefinition.name}`}</div>
            <div data-test-subj="exec-output-userInput">{`command input: ${command.input}`}</div>
            <EuiCode data-test-subj="exec-output-argsJson">
              {JSON.stringify(command.args, null, 2)}
            </EuiCode>
          </div>
        ),
      };
    }),

    // getHelp: jest.fn(async () => {
    //   return {
    //     result: <div data-test-subj="help-content">{'help here'}</div>,
    //   };
    // }),
    //
    // getCommandUsage: jest.fn(async () => {
    //   return {
    //     result: <div data-test-subj="cmd-useage">{'usage here'}</div>,
    //   };
    // }),
  };
};
