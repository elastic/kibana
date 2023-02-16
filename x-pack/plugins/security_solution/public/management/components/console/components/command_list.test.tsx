/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleTestSetup } from '../mocks';
import { getCommandListMock, getConsoleTestSetup } from '../mocks';

describe('When displaying the command list', () => {
  let render: ConsoleTestSetup['renderConsole'];
  let renderResult: ReturnType<typeof render>;
  let selectors: ConsoleTestSetup['selectors'];

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
    selectors = testSetup.selectors;
  });

  describe('and its displayed on the side panel', () => {
    let renderAndOpenHelpPanel: typeof render;

    beforeEach(() => {
      renderAndOpenHelpPanel = (props) => {
        render(props);
        renderResult.getByTestId('test-header-helpButton').click();
        return renderResult;
      };
    });

    it('should display helpful tips', async () => {
      renderAndOpenHelpPanel();

      expect(renderResult.getByTestId('test-commandList-helpfulTips')).toHaveTextContent(
        'Helpful tips:You can enter consecutive response actions — no need to wait for previous ' +
          'actions to complete.Leaving the response console does not terminate any actions that have ' +
          'been submitted.Learn moreExternal link(opens in a new tab or window) about response actions ' +
          'and using the console.'
      );

      expect(renderResult.getByTestId('test-commandList-helpfulHintDocLink')).toBeTruthy();
    });

    it('should display common commands and parameters section', async () => {
      renderAndOpenHelpPanel();

      expect(
        renderResult.getByTestId('test-commandList-Supportingcommandsparameters')
      ).toBeTruthy();
    });

    it('should group commands by group label', async () => {
      renderAndOpenHelpPanel();
      // FYI: we're collapsing the labels here because EUI includes mobile elements
      // in the DOM that have the same test ids
      const groups = Array.from(
        new Set(
          renderResult
            .getAllByTestId('test-commandList-group')
            .map((element) => element.textContent)
        )
      );

      expect(groups).toEqual([
        'group 1',
        'Supporting commands & parameters',
        'group 2',
        'Other commands',
      ]);
    });

    it('should display the list of command in the expected order', () => {
      renderAndOpenHelpPanel();
      const group1Ele = renderResult.getByTestId('test-commandList-group1');
      const commands = Array.from(group1Ele.querySelectorAll('tbody td .euiTableCellContent')).map(
        (ele) => ele.textContent
      );

      expect(commands).toEqual(['cmd6 --foohas custom hint text', 'cmd1a command with no options']);
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
      expect(selectors.getInputText()).toEqual('cmd6 --foo ');
    });
  });
});
