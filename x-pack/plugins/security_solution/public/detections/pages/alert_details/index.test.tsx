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

// Mock npm modules
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
(useParams as jest.Mock).mockReturnValue(mockAlertDetailsFieldsResponse._id);

// Internal Mocks
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
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
jest.mock('../../../timelines/containers/details', () => ({
  useTimelineEventsDetails: jest.fn(() => [
    false,
    mockAlertDetailsTimelineResponse,
    mockAlertDetailsFieldsResponse,
    mockAlertNestedDetailsTimelineResponse,
    jest.fn(),
  ]),
}));

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

// Cypress tests can be found in x-pack/plugins/security_solution/cypress/e2e/detection_alert_details
describe('Alert Details Page', () => {
  it('should render the summary page by default', () => {
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
});
