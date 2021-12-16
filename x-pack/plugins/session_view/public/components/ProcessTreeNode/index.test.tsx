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

      expect(renderResult.queryByTestId('processTreeNode')).toBeTruthy();
    });
    it('renders orphaned node', async () => {
      renderResult = mockedContext.render(<ProcessTreeNode process={processMock} isOrphan />);
      expect(renderResult.queryByText(/orphaned/i)).toBeTruthy();
    });

    it('renders user icon for user entered process', async () => {
      const userEnteredProcessMock: typeof processMock = {
        ...processMock,
        isUserEntered: () => true,
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={userEnteredProcessMock} />);

      expect(renderResult.queryByTestId('processTreeNodeUserIcon')).toBeTruthy();
    });

    it('renders Exec icon for executed process', async () => {
      const executedProcessMock: typeof processMock = {
        ...processMock,
        hasExec: () => true,
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={executedProcessMock} />);

      expect(renderResult.queryByTestId('processTreeNodeExecIcon')).toBeTruthy();
    });

    it('renders Root Escalation flag properly', async () => {
      const rootEscalationProcessMock: typeof processMock = {
        ...processMock,
        getDetails: () => ({
          ...processMock.getDetails(),
          process: {
            ...processMock.getDetails().process,
            // @ts-ignore
            parent: {
              user: {
                name: 'test',
                id: '1000',
              },
            },
            user: {
              id: '-1',
              name: 'root',
            },
          },
        }),
      };

      renderResult = mockedContext.render(<ProcessTreeNode process={rootEscalationProcessMock} />);

      expect(renderResult.queryByTestId('processTreeNodeRootEscalationFlag')).toBeTruthy();
    });

    it('executes callback function when user Clicks', async () => {
      const onProcessSelected = jest.fn();

      renderResult = mockedContext.render(
        <ProcessTreeNode process={processMock} onProcessSelected={onProcessSelected} />
      );

      userEvent.click(renderResult.getByTestId('processTreeNodeRow'));
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

      userEvent.click(renderResult.getByTestId('processTreeNodeRow'));
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
        expect(renderResult.queryByTestId('sessionViewAlertDetails')).toBeTruthy();
        userEvent.click(renderResult.getByTestId('processTreeNodeAlertButton'));
        expect(renderResult.queryByTestId('sessionViewAlertDetails')).toBeFalsy();
      });
    });
    describe('Child processes', () => {
      it('renders Child processes button when process has Child processes', async () => {
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          children: [processMock],
        };

        renderResult = mockedContext.render(<ProcessTreeNode process={processMockWithChildren} />);

        expect(renderResult.queryByTestId('processTreeNodeChildProcessesButton')).toBeTruthy();
      });
      it('toggle Child processes nodes when Child processes button is clicked', async () => {
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          children: [processMock],
        };

        renderResult = mockedContext.render(<ProcessTreeNode process={processMockWithChildren} />);

        expect(renderResult.getAllByTestId('processTreeNode')).toHaveLength(1);

        userEvent.click(renderResult.getByTestId('processTreeNodeChildProcessesButton'));
        expect(renderResult.getAllByTestId('processTreeNode')).toHaveLength(2);

        userEvent.click(renderResult.getByTestId('processTreeNodeChildProcessesButton'));
        expect(renderResult.getAllByTestId('processTreeNode')).toHaveLength(1);
      });
    });
  });
});
