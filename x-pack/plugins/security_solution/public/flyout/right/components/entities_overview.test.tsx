/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_USER_OVERVIEW_TEST_ID,
  INSIGHTS_ENTITIES_TOGGLE_ICON_TEST_ID,
  INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID,
  INSIGHTS_ENTITIES_TITLE_ICON_TEST_ID,
  INSIGHTS_ENTITIES_TITLE_TEXT_TEST_ID,
} from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { TestProviders } from '../../../common/mock';
import { mockGetFieldsData } from '../mocks/mock_context';

describe('<EntitiesOverview />', () => {
  it('should render wrapper component', () => {
    const contextValue = {
      eventId: 'event id',
      getFieldsData: mockGetFieldsData,
    } as unknown as RightPanelContext;

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(INSIGHTS_ENTITIES_TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID)).toHaveTextContent('Entities');
    expect(getByTestId(INSIGHTS_ENTITIES_TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INSIGHTS_ENTITIES_TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render user and host', () => {
    const contextValue = {
      eventId: 'event id',
      getFieldsData: mockGetFieldsData,
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should only render user when host name is null', () => {
    const contextValue = {
      eventId: 'event id',
      getFieldsData: (field: string) => (field === 'user.name' ? 'user1' : null),
    } as unknown as RightPanelContext;

    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
  });

  it('should only render host when user name is null', () => {
    const contextValue = {
      eventId: 'event id',
      getFieldsData: (field: string) => (field === 'host.name' ? 'host1' : null),
    } as unknown as RightPanelContext;

    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(ENTITIES_HOST_OVERVIEW_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ENTITIES_USER_OVERVIEW_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render if both host name and user name are null/blank', () => {
    const contextValue = {
      eventId: 'event id',
      getFieldsData: (field: string) => {},
    } as unknown as RightPanelContext;

    const { container } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should not render if eventId is null', () => {
    const contextValue = {
      eventId: null,
      getFieldsData: (field: string) => {},
    } as unknown as RightPanelContext;

    const { container } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <EntitiesOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
