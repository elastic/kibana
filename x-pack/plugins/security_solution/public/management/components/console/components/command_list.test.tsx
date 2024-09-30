/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleTestSetup, HelpSidePanelSelectorsAndActions } from '../mocks';
import {
  getCommandListMock,
  getConsoleTestSetup,
  getHelpSidePanelSelectorsAndActionsMock,
} from '../mocks';
import React from 'react';

describe('When rendering the command list (help output)', () => {
  let render: ConsoleTestSetup['renderConsole'];
  let renderResult: ReturnType<typeof render>;
  let consoleSelectors: ConsoleTestSetup['selectors'];
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
    consoleSelectors = testSetup.selectors;
    enterCommand = testSetup.enterCommand;
  });

  describe('and its displayed on the side panel', () => {
    let renderAndOpenHelpPanel: typeof render;
    let helpPanelSelectors: HelpSidePanelSelectorsAndActions;

    beforeEach(() => {
      renderAndOpenHelpPanel = (props) => {
        render(props);
        helpPanelSelectors = getHelpSidePanelSelectorsAndActionsMock(renderResult);
        consoleSelectors.openHelpPanel();

        return renderResult;
      };
    });

    it('should display the help panel header', () => {
      renderAndOpenHelpPanel();

      expect(renderResult.getByTestId('test-sidePanel-header')).toHaveTextContent(
        'HelpUse the add () button to populate a response action to the text bar. Add ' +
          'additional parameters or comments as necessary.'
      );
    });

    it('should display the command list', () => {
      renderAndOpenHelpPanel();

      expect(renderResult.getByTestId('test-commandList')).toBeTruthy();
    });

    it('should close the side panel when close button is clicked', () => {
      renderAndOpenHelpPanel();
      consoleSelectors.closeHelpPanel();

      expect(renderResult.queryByTestId('test-sidePanel')).toBeNull();
    });

    it('should display helpful tips', () => {
      renderAndOpenHelpPanel();

      expect(renderResult.getByTestId('test-commandList-helpfulTips')).toHaveTextContent(
        'Helpful tips:You can enter consecutive response actions — no need to wait for previous ' +
          'actions to complete.Leaving the response console does not terminate any actions that have ' +
          'been submitted.Learn moreExternal link(opens in a new tab or window) about response actions ' +
          'and using the console.'
      );

      expect(renderResult.getByTestId('test-commandList-helpfulHintDocLink')).toBeTruthy();
    });

    it('should display common commands and parameters section', () => {
      renderAndOpenHelpPanel();

      expect(
        renderResult.getByTestId('test-commandList-Supportingcommandsparameters')
      ).toBeTruthy();
    });

    it('should group commands by group label', () => {
      renderAndOpenHelpPanel();
      const groups = helpPanelSelectors.getHelpGroupLabels();

      expect(groups).toEqual([
        'group 1',
        'Supporting commands & parameters',
        'group 2',
        'Other commands',
      ]);
    });

    it('should display the list of command in the expected order', () => {
      renderAndOpenHelpPanel();
      const commands = helpPanelSelectors.getHelpCommandNames('group 1');

      expect(commands).toEqual(['cmd6 --foo', 'cmd1']);
    });

    it('should hide command if command definition helpHidden is true', () => {
      const commands = getCommandListMock();
      commands[0].helpHidden = true;
      renderAndOpenHelpPanel({ commands });

      expect(renderResult.queryByTestId('test-commandList-group1-cmd1')).toBeNull();
    });

    it('should disable "add to text bar" button if command definition helpHidden is true', () => {
      const commands = getCommandListMock();
      commands[0].helpDisabled = true;
      renderAndOpenHelpPanel({ commands });

      expect(renderResult.getByTestId('test-commandList-group1-cmd1-addToInput')).toBeDisabled();
    });

    it('should add command to console input when [+] button is clicked', () => {
      renderAndOpenHelpPanel();
      renderResult.getByTestId('test-commandList-group1-cmd6-addToInput').click();
      expect(consoleSelectors.getInputText()).toEqual('cmd6 --foo ');
    });

    it('should display custom help output when Command service has `getHelp()` defined', async () => {
      const HelpComponent: React.FunctionComponent = () => {
        return <div data-test-subj="custom-help">{'help output'}</div>;
      };
      render({ HelpComponent });
      await enterCommand('help');

      expect(renderResult.getByTestId('custom-help')).toBeInTheDocument();
    });
  });

  describe('And displayed when `help` command is entered', () => {
    it('should display custom help output when Command service has `getHelp()` defined', async () => {
      const HelpComponent: React.FunctionComponent = () => {
        return <div data-test-subj="custom-help">{'help output'}</div>;
      };
      render({ HelpComponent });
      await enterCommand('help');

      expect(renderResult.getByTestId('custom-help')).toBeInTheDocument();
    });
  });
});
