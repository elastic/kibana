/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, useParams } from 'react-router-dom';
import { render } from '@testing-library/react';
import { AlertDetailsPage } from '.';
import { TestProviders } from '../../../common/mock';
import {
  mockAlertDetailsFieldsResponse,
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from './__mocks__';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';

// Node modules mocks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

(useParams as jest.Mock).mockReturnValue(mockAlertDetailsFieldsResponse._id);

// Internal Mocks
jest.mock('../../../timelines/containers/details');
jest.mock('../../../timelines/store/timeline', () => ({
  ...jest.requireActual('../../../timelines/store/timeline'),
  timelineActions: {
    createTimeline: jest.fn().mockReturnValue('new-timeline'),
  },
}));

jest.mock('../../../common/containers/sourcerer', () => {
  const mockSourcererReturn = {
    browserFields: {},
    loading: true,
    indexPattern: {},
    selectedPatterns: [],
    missingPatterns: [],
  };
  return {
    useSourcererDataView: jest.fn().mockReturnValue(mockSourcererReturn),
  };
});

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const getMockHistory = () => ({
  length: 1,
  location: {
    pathname: `/alerts/${mockAlertDetailsFieldsResponse._id}/summary`,
    search: '',
    state: '',
    hash: '',
  },
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
});

describe('Alert Details Page', () => {
  it('should render the loading page', () => {
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([true, null, null, null, jest.fn()]);
    const { getByTestId } = render(
      <TestProviders>
        <Router history={getMockHistory()}>
          <AlertDetailsPage />
        </Router>
      </TestProviders>
    );

    expect(getByTestId('alert-details-page-loading')).toBeVisible();
  });

  it('should render the error page', () => {
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, null, null, null, jest.fn()]);
    const { getByTestId } = render(
      <TestProviders>
        <Router history={getMockHistory()}>
          <AlertDetailsPage />
        </Router>
      </TestProviders>
    );

    expect(getByTestId('alert-details-page-error')).toBeVisible();
  });

  it('should render the header', () => {
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      mockAlertDetailsTimelineResponse,
      mockAlertDetailsFieldsResponse,
      mockAlertNestedDetailsTimelineResponse,
      jest.fn(),
    ]);
    const { getByTestId } = render(
      <TestProviders>
        <Router history={getMockHistory()}>
          <AlertDetailsPage />
        </Router>
      </TestProviders>
    );

    expect(getByTestId('header-page-title')).toHaveTextContent(
      mockAlertDetailsFieldsResponse.fields[ALERT_RULE_NAME][0]
    );
  });

  it('should create a timeline', () => {
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      mockAlertDetailsTimelineResponse,
      mockAlertDetailsFieldsResponse,
      mockAlertNestedDetailsTimelineResponse,
      jest.fn(),
    ]);
    render(
      <TestProviders>
        <Router history={getMockHistory()}>
          <AlertDetailsPage />
        </Router>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalledWith('new-timeline');
  });
});
