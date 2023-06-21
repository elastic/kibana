/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleProps } from '../..';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../../mocks';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('When displaying the side panel', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => {
      renderResult = testSetup.renderConsole(props);
      return renderResult;
    };
  });

  describe('and displaying Help content', () => {
    let renderAndOpenHelp: typeof render;

    beforeEach(() => {
      renderAndOpenHelp = (props) => {
        render(props);
        act(() => {
          userEvent.click(renderResult.getByTestId('test-header-helpButton'));
        });

        expect(renderResult.getByTestId('test-sidePanel')).toBeTruthy();

        return renderResult;
      };
    });

    it('should display the help panel content', () => {
      renderAndOpenHelp();

      expect(renderResult.getByTestId('test-sidePanel-helpContent')).toBeTruthy();
    });
  });
});
