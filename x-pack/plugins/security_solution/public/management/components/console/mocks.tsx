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
import { act, within } from '@testing-library/react';
import { convertToTestId } from './components/command_list';
import { Console } from './console';
import type {
  CommandArgumentValueSelectorProps,
  CommandDefinition,
  CommandExecutionComponent,
  ConsoleProps,
} from './types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';

interface ConsoleSelectorsAndActionsMock {
  getLeftOfCursorInputText: () => string;
  getRightOfCursorInputText: () => string;
  getInputText: () => string;
  openHelpPanel: () => void;
  closeHelpPanel: () => void;
  /** Clicks on the submit button on the far right of the console's input area */
  submitCommand: () => void;
  /** Enters a command into the console's input area */
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

export interface ConsoleTestSetup
  extends Pick<
    AppContextTestRender,
    'startServices' | 'coreStart' | 'depsStart' | 'queryClient' | 'history' | 'setExperimentalFlag'
  > {
  renderConsole(props?: Partial<ConsoleProps>): ReturnType<AppContextTestRender['render']>;

  commands: CommandDefinition[];

  enterCommand: ConsoleSelectorsAndActionsMock['enterCommand'];

  selectors: ConsoleSelectorsAndActionsMock;
}

/**
 * A set of jest selectors and actions for interacting with the console
 * @param dataTestSubj
 */
export const getConsoleSelectorsAndActionMock = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): ConsoleTestSetup['selectors'] => {
  const getLeftOfCursorInputText: ConsoleSelectorsAndActionsMock['getLeftOfCursorInputText'] =
    () => {
      return renderResult.getByTestId(`${dataTestSubj}-cmdInput-leftOfCursor`).textContent ?? '';
    };
  const getRightOfCursorInputText: ConsoleSelectorsAndActionsMock['getRightOfCursorInputText'] =
    () => {
      return renderResult.getByTestId(`${dataTestSubj}-cmdInput-rightOfCursor`).textContent ?? '';
    };
  const getInputText: ConsoleSelectorsAndActionsMock['getInputText'] = () => {
    return getLeftOfCursorInputText() + getRightOfCursorInputText();
  };

  const isHelpPanelOpen = (): boolean => {
    return Boolean(renderResult.queryByTestId(`${dataTestSubj}-sidePanel-helpContent`));
  };

  const openHelpPanel: ConsoleSelectorsAndActionsMock['openHelpPanel'] = () => {
    if (!isHelpPanelOpen()) {
      renderResult.getByTestId(`${dataTestSubj}-header-helpButton`).click();
    }
  };
  const closeHelpPanel: ConsoleSelectorsAndActionsMock['closeHelpPanel'] = () => {
    if (isHelpPanelOpen()) {
      renderResult.getByTestId(`${dataTestSubj}-sidePanel-headerCloseButton`).click();
    }
  };
  const submitCommand: ConsoleSelectorsAndActionsMock['submitCommand'] = () => {
    renderResult.getByTestId(`${dataTestSubj}-inputTextSubmitButton`).click();
  };
  const enterCommand: ConsoleSelectorsAndActionsMock['enterCommand'] = (cmd, options = {}) => {
    enterConsoleCommand(renderResult, cmd, options);
  };

  return {
    getInputText,
    getLeftOfCursorInputText,
    getRightOfCursorInputText,
    openHelpPanel,
    closeHelpPanel,
    submitCommand,
    enterCommand,
  };
};

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
  const { startServices, coreStart, depsStart, queryClient, history, setExperimentalFlag } =
    mockedContext;

  let renderResult: ReturnType<AppContextTestRender['render']>;

  const commandList = getCommandListMock();

  let testSubj: string;

  const renderConsole: ConsoleTestSetup['renderConsole'] = ({
    prompt = '$$>',
    commands = commandList,
    'data-test-subj': dataTestSubj = 'test',
    ...others
  } = {}) => {
    testSubj = dataTestSubj;

    return (renderResult = mockedContext.render(
      <Console prompt={prompt} commands={commands} data-test-subj={dataTestSubj} {...others} />
    ));
  };

  const enterCommand: ConsoleTestSetup['enterCommand'] = (cmd, options = {}) => {
    enterConsoleCommand(renderResult, cmd, options);
  };

  let selectors: ConsoleSelectorsAndActionsMock;
  const initSelectorsIfNeeded = () => {
    if (selectors) {
      return selectors;
    }

    if (!testSubj) {
      throw new Error(`no 'dataTestSubj' provided to 'render()'!`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    selectors = getConsoleSelectorsAndActionMock(renderResult, testSubj!);
  };

  return {
    startServices,
    coreStart,
    depsStart,
    queryClient,
    history,
    setExperimentalFlag,
    renderConsole,
    commands: commandList,
    enterCommand,
    selectors: {
      getInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getInputText();
      },
      getLeftOfCursorInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getLeftOfCursorInputText();
      },
      getRightOfCursorInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getRightOfCursorInputText();
      },
      openHelpPanel: () => {
        initSelectorsIfNeeded();
        return selectors.openHelpPanel();
      },
      closeHelpPanel: () => {
        initSelectorsIfNeeded();
        return selectors.closeHelpPanel();
      },
      submitCommand: () => {
        initSelectorsIfNeeded();
        return selectors.submitCommand();
      },
      enterCommand: (
        cmd: string,
        options?: Partial<{ inputOnly: boolean; useKeyboard: boolean }>
      ) => {
        initSelectorsIfNeeded();
        return selectors.enterCommand(cmd, options);
      },
    },
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
      helpGroupLabel: 'group 1',
    },
    {
      name: 'cmd2',
      about: 'runs cmd 2',
      RenderComponent: jest.fn(RenderComponent),
      helpGroupLabel: 'group 2',
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
      helpGroupPosition: 0,
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
      helpGroupPosition: 1,
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
      helpGroupLabel: 'group 1',
      helpGroupPosition: 0,
      helpCommandPosition: 0,
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
      helpGroupLabel: 'group 2',
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
>(({ value, valueText, onChange, argName, argIndex }) => {
  useEffect(() => {
    if (!value) {
      onChange({ valueText: 'foo selected', value: { selection: 'foo' } });
    }
  }, [onChange, value]);

  return (
    <span data-test-subj="argSelectorValueText">{`${argName}[${argIndex}]: ${valueText}`}</span>
  );
});
ArgumentSelectorComponentMock.displayName = 'ArgumentSelectorComponentMock';

export interface HelpSidePanelSelectorsAndActions {
  getHelpGroupLabels: () => string[];
  getHelpCommandNames: (forGroup?: string) => string[];
}

export const getHelpSidePanelSelectorsAndActionsMock = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): HelpSidePanelSelectorsAndActions => {
  const getHelpGroupLabels: HelpSidePanelSelectorsAndActions['getHelpGroupLabels'] = () => {
    // FYI: we're collapsing the labels here because EUI includes mobile elements
    // in the DOM that have the same test ids
    return Array.from(
      new Set(
        renderResult
          .getAllByTestId(`${dataTestSubj}-commandList-group`)
          .map((element) => element.textContent ?? '')
      )
    );
  };

  const getHelpCommandNames: HelpSidePanelSelectorsAndActions['getHelpCommandNames'] = (
    forGroup
  ) => {
    let searchContainer = renderResult.container;

    if (forGroup) {
      searchContainer = renderResult.getByTestId(
        `${dataTestSubj}-commandList-${convertToTestId(forGroup)}`
      );
    }

    return within(searchContainer)
      .getAllByTestId(`${dataTestSubj}-commandList-commandName`)
      .map((commandEle) => commandEle.textContent ?? '');
  };

  return {
    getHelpGroupLabels,
    getHelpCommandNames,
  };
};
