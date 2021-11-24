/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { sessionViewProcessEventsMock } from '../../../common/schemas/responses/session_view_process_events.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock';
import { getSessionViewProcessEvents } from './service';
import { SessionView } from './index';

jest.mock('./service');

const getSessionViewProcessEventsMock = getSessionViewProcessEvents as jest.Mock;

describe('SessionView component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  const waitForApiCall = () => {
    return waitFor(() => expect(getSessionViewProcessEventsMock).toHaveBeenCalled());
  };

  beforeEach(() => {
    getSessionViewProcessEventsMock.mockClear();
    mockedContext = createAppRootMockRenderer();
    render = () =>
      (renderResult = mockedContext.render(<SessionView sessionEntityId="test-entity-id" />));
  });

  describe('When SessionView is mounted', () => {
    describe('And no data exists', () => {
      beforeEach(async () => {
        getSessionViewProcessEventsMock.mockReturnValue({
          events: {
            hits: [],
            total: 0,
          },
          alerts: {
            hits: [],
            total: 0,
          },
        });
      });

      it('should show the Empty message', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('sessionViewProcessEventsEmpty')).toBeTruthy();
      });

      it('should not display the search bar', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.queryByTestId('sessionViewProcessEventsSearch')).toBeFalsy();
      });
    });

    describe('And data exists', () => {
      beforeEach(async () => {
        getSessionViewProcessEventsMock.mockImplementation(sessionViewProcessEventsMock);
      });

      it('should show loading indicator while retrieving data and hide it when it gets it', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        // make the request wait
        getSessionViewProcessEventsMock.mockReturnValue(
          new Promise((resolve) => (releaseApiResponse = resolve))
        );
        render();
        await waitForApiCall();

        // see if loader is present
        expect(renderResult.getByTestId('sectionLoading')).toBeTruthy();

        // release the request
        releaseApiResponse!(getSessionViewProcessEventsMock());

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByTestId('sectionLoading'));
      });

      it('should display the search bar', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('sessionViewProcessEventsSearch')).toBeTruthy();
      });

      it('should show items on the list', async () => {
        render();
        await waitForApiCall();

        expect(renderResult.getByTestId('processTreeNode')).toBeTruthy();
      });
    });
  });
});
