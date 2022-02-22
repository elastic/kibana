/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react';
import { SessionViewTableProcessTree } from '.';
import { SessionLeaderTableProps } from '../SessionLeaderTable';
import { ActionProps } from '../../../../timelines/common';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';

const mockActionProps: ActionProps = {
  ariaRowindex: 0,
  index: 0,
  rowIndex: 0,
  checked: false,
  showCheckboxes: true,
  columnId: 'test-column-id',
  columnValues: 'test-column-values',
  data: [],
  ecsData: {
    _id: 'test-ecs-data-id',
  },
  eventId: 'test-event-id',
  loadingEventIds: [],
  onEventDetailsPanelOpened: () => {},
  onRowSelected: () => {},
  setEventsDeleted: () => {},
  setEventsLoading: () => {},
  timelineId: 'test-timeline-id',
};

jest.mock('../SessionView/index.tsx', () => {
  return {
    SessionView: () => {
      return <div data-test-subj="SessionView">Mock</div>;
    },
  };
});

jest.mock('../SessionLeaderTable/index.tsx', () => {
  return {
    SessionLeaderTable: (props: SessionLeaderTableProps) => {
      const { onOpenSessionViewer = () => {} } = props;
      return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
          data-test-subj="SessionLeaderTable"
          onClick={() => onOpenSessionViewer(mockActionProps)}
        >
          Mock
        </div>
      );
    },
  };
});

describe('SessionViewTableProcessTree component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const waitForApiCall = () => waitFor(() => expect(mockedApi).toHaveBeenCalled());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
  });

  describe('SessionViewTableProcessTree mounts', () => {
    beforeEach(async () => {
      mockedApi.mockResolvedValue({
        session_entry_leader: {
          process: {
            entity_id: 'test-entity-id',
          },
        },
      });
    });

    it('Renders session leader table initially', async () => {
      renderResult = mockedContext.render(<SessionViewTableProcessTree />);
      expect(renderResult.queryByTestId('SessionLeaderTable')).toBeTruthy();
      expect(renderResult.queryByTestId('SessionView')).toBeNull();
    });

    it('Switches to session view when the user picks a session', async () => {
      renderResult = mockedContext.render(<SessionViewTableProcessTree />);
      const sessionLeaderTable = renderResult.getByTestId('SessionLeaderTable');
      fireEvent.click(sessionLeaderTable);
      await waitForApiCall();

      // Now that we fetched the entity id, session view should be visible
      expect(renderResult.queryByTestId('SessionView')).toBeTruthy();
      expect(renderResult.queryByTestId('SessionLeaderTable')).toBeNull();
    });

    it('Close button works', async () => {
      renderResult = mockedContext.render(<SessionViewTableProcessTree />);
      const sessionLeaderTable = renderResult.getByTestId('SessionLeaderTable');
      fireEvent.click(sessionLeaderTable);
      await waitForApiCall();

      expect(renderResult.queryByTestId('SessionView')).toBeTruthy();
      expect(renderResult.queryByTestId('SessionLeaderTable')).toBeNull();

      const closeButton = renderResult.getByTestId('session-view-close-button');
      fireEvent.click(closeButton);

      expect(renderResult.queryByTestId('SessionLeaderTable')).toBeTruthy();
      expect(renderResult.queryByTestId('SessionView')).toBeNull();
    });
  });
});
