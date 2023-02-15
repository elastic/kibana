/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleTestSetup } from '../mocks';
import { getConsoleTestSetup } from '../mocks';

describe('When displaying the command list', () => {
  let render: ConsoleTestSetup['renderConsole'];
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
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
        'Other commands',
        'Supporting commands & parameters',
        'group 2',
      ]);
    });

    it.todo('should display the list of command in the expected order');

    it.todo('should hide command if command definition helpHidden is true');

    it.todo('should disable "add to text bar" button if command definition helpHidden is true');
  });
});
