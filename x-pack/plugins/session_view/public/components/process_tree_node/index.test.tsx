/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  processMock,
  childProcessMock,
  sessionViewAlertProcessMock,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeNode } from './index';

describe('ProcessTreeNode component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeNode is mounted', () => {
    it('should render given a valid process', async () => {
      renderResult = mockedContext.render(<ProcessTreeNode process={processMock} />);

      expect(renderResult.queryByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should have an alternate rendering for a session leader', async () => {
      renderResult = mockedContext.render(
        <ProcessTreeNode isSessionLeader process={processMock} />
      );

      expect(renderResult.container.textContent).toEqual(' bash started by  vagrant');
    });

    // commented out until we get new UX for orphans treatment aka disjointed tree
    // it('renders orphaned node', async () => {
    //   renderResult = mockedContext.render(<ProcessTreeNode process={processMock} />);
    //   expect(renderResult.queryByText(/orphaned/i)).toBeTruthy();
    // });

    it('renders Exec icon and exit code for executed process', async () => {
      const executedProcessMock: typeof processMock = {
        ...processMock,
        hasExec: () => true,
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={executedProcessMock} />);

      expect(renderResult.queryByTestId('sessionView:processTreeNodeExecIcon')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionView:processTreeNodeExitCode')).toBeTruthy();
    });

    it('does not render exit code if it does not exist', async () => {
      const processWithoutExitCode: typeof processMock = {
        ...processMock,
        hasExec: () => true,
        getDetails: () => ({
          ...processMock.getDetails(),
          process: {
            ...processMock.getDetails().process,
            exit_code: undefined,
          },
        }),
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={processWithoutExitCode} />);
      expect(renderResult.queryByTestId('sessionView:processTreeNodeExitCode')).toBeFalsy();
    });

    it('renders Root Escalation flag properly', async () => {
      const rootEscalationProcessMock: typeof processMock = {
        ...processMock,
        getDetails: () => ({
          ...processMock.getDetails(),
          user: {
            id: '-1',
            name: 'root',
          },
          process: {
            ...processMock.getDetails().process,
            parent: {
              ...processMock.getDetails().process.parent,
              user: {
                name: 'test',
                id: '1000',
              },
            },
          },
        }),
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={rootEscalationProcessMock} />);

      expect(
        renderResult.queryByTestId('sessionView:processTreeNodeRootEscalationFlag')
      ).toBeTruthy();
    });

    it('executes callback function when user Clicks', async () => {
      const onProcessSelected = jest.fn();

      renderResult = mockedContext.render(
        <ProcessTreeNode process={processMock} onProcessSelected={onProcessSelected} />
      );

      userEvent.click(renderResult.getByTestId('sessionView:processTreeNodeRow'));
      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('does not executes callback function when user is Clicking to copy text', async () => {
      const windowGetSelectionSpy = jest.spyOn(window, 'getSelection');

      const onProcessSelected = jest.fn();

      renderResult = mockedContext.render(
        <ProcessTreeNode process={processMock} onProcessSelected={onProcessSelected} />
      );

      // @ts-ignore
      windowGetSelectionSpy.mockImplementation(() => ({ type: 'Range' }));

      userEvent.click(renderResult.getByTestId('sessionView:processTreeNodeRow'));
      expect(onProcessSelected).not.toHaveBeenCalled();

      // cleanup
      windowGetSelectionSpy.mockRestore();
    });
    describe('Alerts', () => {
      it('renders Alert button when process has alerts', async () => {
        renderResult = mockedContext.render(
          <ProcessTreeNode process={sessionViewAlertProcessMock} />
        );

        expect(renderResult.queryByTestId('processTreeNodeAlertButton')).toBeTruthy();
      });
      it('toggle Alert Details button when Alert button is clicked', async () => {
        renderResult = mockedContext.render(
          <ProcessTreeNode process={sessionViewAlertProcessMock} />
        );
        userEvent.click(renderResult.getByTestId('processTreeNodeAlertButton'));
        expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeTruthy();
        userEvent.click(renderResult.getByTestId('processTreeNodeAlertButton'));
        expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeFalsy();
      });
    });
    describe('Child processes', () => {
      it('renders Child processes button when process has Child processes', async () => {
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          getChildren: () => [childProcessMock],
        };

        renderResult = mockedContext.render(<ProcessTreeNode process={processMockWithChildren} />);

        expect(
          renderResult.queryByTestId('sessionView:processTreeNodeChildProcessesButton')
        ).toBeTruthy();
      });
      it('toggle Child processes nodes when Child processes button is clicked', async () => {
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          getChildren: () => [childProcessMock],
        };

        renderResult = mockedContext.render(<ProcessTreeNode process={processMockWithChildren} />);

        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(1);

        userEvent.click(
          renderResult.getByTestId('sessionView:processTreeNodeChildProcessesButton')
        );
        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(2);

        userEvent.click(
          renderResult.getByTestId('sessionView:processTreeNodeChildProcessesButton')
        );
        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(1);
      });
    });
    describe('Search', () => {
      it('highlights text within the process node line item if it matches the searchQuery', () => {
        // set a mock search matched indicator for the process (typically done by ProcessTree/helpers.ts)
        processMock.searchMatched = '/vagrant';

        renderResult = mockedContext.render(<ProcessTreeNode process={processMock} />);

        expect(
          renderResult.getByTestId('sessionView:processNodeSearchHighlight').textContent
        ).toEqual('/vagrant');
      });
    });
  });
});
