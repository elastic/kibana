/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

import React, { memo, useEffect } from 'react';
import { EuiCode } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { Console } from './console';
import type {
  ConsoleProps,
  CommandDefinition,
  CommandExecutionComponent,
  CommandArgumentValueSelectorProps,
} from './types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';

export interface ConsoleTestSetup {
  renderConsole(props?: Partial<ConsoleProps>): ReturnType<AppContextTestRender['render']>;

  commands: CommandDefinition[];

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

  const commandList = getCommandListMock();

  const renderConsole: ConsoleTestSetup['renderConsole'] = ({
    prompt = '$$>',
    commands = commandList,
    'data-test-subj': dataTestSubj = 'test',
    ...others
  } = {}) => {
    return (renderResult = mockedContext.render(
      <Console prompt={prompt} commands={commands} data-test-subj={dataTestSubj} {...others} />
    ));
  };

  const enterCommand: ConsoleTestSetup['enterCommand'] = (cmd, options = {}) => {
    enterConsoleCommand(renderResult, cmd, options);
  };

  return {
    renderConsole,
    commands: commandList,
    enterCommand,
  };
};

export const getCommandListMock = (): CommandDefinition[] => {
  const RenderComponent: CommandExecutionComponent = ({
    command,
    status,
    setStatus,
    setStore,
    store,
  }) => {
    useEffect(() => {
      if (status !== 'success') {
        new Promise((r) => setTimeout(r, 500)).then(() => {
          setStatus('success');
          setStore((prevState) => {
            return { foo: 'bar' };
          });
        });
      }
    }, [setStatus, setStore, status]);

    return (
      <div data-test-subj="exec-output">
        <div data-test-subj="exec-output-cmdName">{`${command.commandDefinition.name}`}</div>
        <div data-test-subj="exec-output-userInput">{`command input: ${command.input}`}</div>
        <EuiCode data-test-subj="exec-output-argsJson">
          {JSON.stringify(command.args, null, 2)}
        </EuiCode>
        <div>{'Command render state:'}</div>
        <div data-test-subj="exec-output-statusState">{`status: ${status}`}</div>
        <EuiCode data-test-subj="exec-output-storeStateJson">
          {JSON.stringify(store, null, 2)}
        </EuiCode>
      </div>
    );
  };

  const commands: CommandDefinition[] = [
    {
      name: 'cmd1',
      about: 'a command with no options',
      RenderComponent: jest.fn(RenderComponent),
    },
    {
      name: 'cmd2',
      about: 'runs cmd 2',
      RenderComponent: jest.fn(RenderComponent),
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
      RenderComponent: jest.fn(RenderComponent),
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
      about: 'all options optional, but at least one is required',
      RenderComponent: jest.fn(RenderComponent),
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
    {
      name: 'cmd5',
      about: 'has custom hint text',
      RenderComponent: jest.fn(RenderComponent),
      mustHaveArgs: true,
      exampleUsage: 'cmd5 --foo 123',
      exampleInstruction: 'Enter --foo to execute',
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
    {
      name: 'cmd6',
      about: 'has custom hint text',
      RenderComponent: jest.fn(RenderComponent),
      mustHaveArgs: true,
      exampleUsage: 'cmd6 --foo 123',
      exampleInstruction: 'Enter --foo to execute',
      args: {
        foo: {
          about: 'foo stuff',
          required: false,
          exclusiveOr: true,
          allowMultiples: false,
        },
        bar: {
          about: 'bar stuff',
          required: false,
          exclusiveOr: true,
          allowMultiples: false,
        },
      },
    },
    {
      name: 'cmd7',
      about: 'Command with argument selector',
      RenderComponent: jest.fn(RenderComponent),
      args: {
        foo: {
          about: 'foo stuff',
          required: true,
          allowMultiples: true,
          SelectorComponent: ArgumentSelectorComponentMock,
        },
      },
    },
  ];

  return commands;
};

export const ArgumentSelectorComponentMock = memo<
  CommandArgumentValueSelectorProps<{ selection: string }>
>(({ value, valueText, onChange }) => {
  useEffect(() => {
    if (!value) {
      onChange({ valueText: 'foo selected', value: { selection: 'foo' } });
    }
  }, [onChange, value]);

  return <span data-test-subj="argSelectorValueText">{valueText}</span>;
});
ArgumentSelectorComponentMock.displayName = 'ArgumentSelectorComponentMock';
