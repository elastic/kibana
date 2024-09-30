/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject } from 'react';
import userEvent from '@testing-library/user-event';
import {
  mockAlerts,
  processMock,
  childProcessMock,
  sessionViewAlertProcessMock,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessDeps, ProcessTreeNode } from '.';
import { Cancelable } from 'lodash';
import { DEBOUNCE_TIMEOUT } from '../../../common/constants';
import { useDateFormat } from '../../hooks';

jest.useFakeTimers();

jest.mock('../../hooks/use_date_format');
const mockUseDateFormat = useDateFormat as jest.Mock;

describe('ProcessTreeNode component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  const props: ProcessDeps = {
    process: processMock,
    scrollerRef: {
      current: {
        getBoundingClientRect: () => ({
          y: 0,
        }),
        clientHeight: 500,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    } as unknown as RefObject<HTMLDivElement>,
    onChangeJumpToEventVisibility: jest.fn(),
    onShowAlertDetails: jest.fn(),
    onJumpToOutput: jest.fn(),
    showTimestamp: true,
    verboseMode: false,
    trackEvent: jest.fn(),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockUseDateFormat.mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  });

  describe('When ProcessTreeNode is mounted', () => {
    it('should render given a valid process', async () => {
      renderResult = mockedContext.render(<ProcessTreeNode {...props} />);

      expect(renderResult.queryByTestId('sessionView:processTreeNode')).toBeTruthy();
    });

    it('should have an alternate rendering for a session leader', async () => {
      renderResult = mockedContext.render(<ProcessTreeNode {...props} isSessionLeader />);

      expect(renderResult.container.textContent?.replace(/\s+/g, ' ')).toEqual(
        ' bash started by vagrant '
      );
    });

    // commented out until we get new UX for orphans treatment aka disjointed tree
    // it('renders orphaned node', async () => {
    //   renderResult = mockedContext.render(<ProcessTreeNode process={processMock} />);
    //   expect(renderResult.queryByText(/orphaned/i)).toBeTruthy();
    // });

    it('renders Exec icon', async () => {
      const executedProcessMock: typeof processMock = {
        ...processMock,
        hasExec: () => true,
      };

      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} process={executedProcessMock} />
      );

      expect(renderResult.queryByTestId('sessionView:processTreeNodeExecIcon')).toBeTruthy();
    });

    it('calls onChangeJumpToEventVisibility with isVisible false if jumpToEvent is not visible', async () => {
      const processWithAlerts: typeof processMock = {
        ...processMock,
        getAlerts: () => {
          return mockAlerts;
        },
      };

      const onChangeJumpToEventVisibility = jest.fn();
      const scrollerRef = {
        current: {
          ...props.scrollerRef.current,
          clientHeight: -500,
          addEventListener: (_event: string, scrollFn: (() => void) & Cancelable) => {
            scrollFn();
          },
          removeEventListener: (_event: string, _fn: (() => void) & Cancelable) => {},
        },
      } as RefObject<HTMLDivElement>;

      renderResult = mockedContext.render(
        <ProcessTreeNode
          {...props}
          process={processWithAlerts}
          investigatedAlertId={mockAlerts[0].kibana?.alert?.uuid}
          scrollerRef={scrollerRef}
          onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
        />
      );

      jest.advanceTimersByTime(DEBOUNCE_TIMEOUT);

      expect(onChangeJumpToEventVisibility).toHaveBeenCalled();
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
            user: {
              id: '-1',
              name: 'root',
            },
            parent: {
              ...processMock.getDetails().process!.parent,
              user: {
                name: 'test',
                id: '1000',
              },
            },
          },
        }),
      };

      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} process={rootEscalationProcessMock} />
      );

      expect(
        renderResult.queryByTestId('sessionView:processTreeNodeRootEscalationFlag')
      ).toBeTruthy();
    });

    it('executes callback function when user Clicks', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onProcessSelected = jest.fn();

      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} process={processMock} onProcessSelected={onProcessSelected} />
      );

      await user.click(renderResult.getByTestId('sessionView:processTreeNodeRow'));
      expect(onProcessSelected).toHaveBeenCalled();
    });

    it('does not executes callback function when user is Clicking to copy text', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const windowGetSelectionSpy = jest.spyOn(window, 'getSelection');

      const onProcessSelected = jest.fn();

      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} process={processMock} onProcessSelected={onProcessSelected} />
      );

      // @ts-ignore
      windowGetSelectionSpy.mockImplementation(() => ({ type: 'Range' }));

      await user.click(renderResult.getByTestId('sessionView:processTreeNodeRow'));
      expect(onProcessSelected).not.toHaveBeenCalled();

      // cleanup
      windowGetSelectionSpy.mockRestore();
    });

    it('When Timestamp is ON, it shows Timestamp', async () => {
      // set a mock where Timestamp is turned ON
      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} showTimestamp={true} process={processMock} />
      );

      expect(renderResult.getByTestId('sessionView:processTreeNodeTimestamp')).toBeTruthy();
    });

    it('When Timestamp is OFF, it doesnt show Timestamp', async () => {
      // set a mock where Timestamp is turned OFF
      renderResult = mockedContext.render(
        <ProcessTreeNode {...props} showTimestamp={false} process={processMock} />
      );

      expect(renderResult.queryByTestId('sessionView:processTreeNodeTimestamp')).toBeFalsy();
    });
    describe('Alerts', () => {
      it('renders Alert button when process has one alert', async () => {
        const processMockWithOneAlert = {
          ...sessionViewAlertProcessMock,
          getAlerts: () => [sessionViewAlertProcessMock.getAlerts()[0]],
        };
        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockWithOneAlert} />
        );

        expect(renderResult.queryByTestId('processTreeNodeAlertButton')).toBeTruthy();
        expect(renderResult.queryByTestId('processTreeNodeAlertButton')?.textContent).toBe('Alert');
      });
      it('renders Alerts button when process has more than one alerts', async () => {
        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={sessionViewAlertProcessMock} />
        );

        expect(renderResult.queryByTestId('processTreeNodeAlertButton')).toBeTruthy();
        expect(renderResult.queryByTestId('processTreeNodeAlertButton')?.textContent).toBe(
          `Alerts (${sessionViewAlertProcessMock.getAlerts().length})`
        );
      });
      it('renders Alerts button with 99+ when process has more than 99 alerts', async () => {
        const processMockWithOneAlert = {
          ...sessionViewAlertProcessMock,
          getAlerts: () =>
            Array.from(
              new Array(100),
              (item) => (item = sessionViewAlertProcessMock.getAlerts()[0])
            ),
        };
        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockWithOneAlert} />
        );

        expect(renderResult.queryByTestId('processTreeNodeAlertButton')).toBeTruthy();
        expect(renderResult.queryByTestId('processTreeNodeAlertButton')?.textContent).toBe(
          'Alerts (99+)'
        );
      });
      it('toggle Alert Details button when Alert button is clicked', async () => {
        // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={sessionViewAlertProcessMock} />
        );
        await user.click(renderResult.getByTestId('processTreeNodeAlertButton'));
        expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeTruthy();
        await user.click(renderResult.getByTestId('processTreeNodeAlertButton'));
        expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeFalsy();
      });
    });

    describe('Output', () => {
      it('renders Output button when process has output', async () => {
        const processMockWithOutput = {
          ...sessionViewAlertProcessMock,
          hasOutput: () => true,
        };
        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockWithOutput} />
        );

        expect(renderResult.queryByTestId('processTreeNodeOutpuButton')).toBeTruthy();
        expect(renderResult.queryByTestId('processTreeNodeOutpuButton')?.textContent).toBe(
          'Output'
        );
      });
    });
    describe('Child processes', () => {
      it('renders Child processes button when process has Child processes', async () => {
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          getChildren: () => [childProcessMock],
        };

        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockWithChildren} />
        );

        expect(
          renderResult.queryByTestId('sessionView:processTreeNodeChildProcessesButton')
        ).toBeTruthy();
      });
      it('toggle Child processes nodes when Child processes button is clicked', async () => {
        // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const processMockWithChildren: typeof processMock = {
          ...processMock,
          getChildren: () => [childProcessMock],
        };

        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockWithChildren} />
        );

        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(1);

        await user.click(
          renderResult.getByTestId('sessionView:processTreeNodeChildProcessesButton')
        );
        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(2);

        await user.click(
          renderResult.getByTestId('sessionView:processTreeNodeChildProcessesButton')
        );
        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toHaveLength(1);
      });
    });
    describe('Search', () => {
      it('highlights text within the process node line item if it matches the searchQuery', () => {
        const searchQuery = '/vagr';
        // set a mock search matched indicator for the process (typically done by ProcessTree/helpers.ts)
        const processMockClone = { ...processMock, searchMatched: [5, 6, 7, 8, 9] };

        renderResult = mockedContext.render(
          <ProcessTreeNode {...props} process={processMockClone} />
        );

        expect(renderResult.queryAllByTestId(`sessionView:splitTextIsHighlighted`)).toHaveLength(
          searchQuery.length
        );
        expect(
          renderResult
            .queryAllByTestId(`sessionView:splitTextIsHighlighted`)
            .map(({ textContent }) => textContent)
            .join('')
        ).toEqual(searchQuery);

        // ensures we are showing the rest of the info, and not replacing it with just the match.
        const { process } = props.process.getDetails();
        expect(renderResult.container.textContent).toContain(
          process?.working_directory + '\xA0' + (process?.args && process.args.join(' '))
        );
      });
    });
  });
});
