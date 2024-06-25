/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { EVENT_CATEGORY_DESCRIPTION_TEST_ID } from './test_ids';
import { EventCategoryDescription } from './event_category_description';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { TestProvidersComponent } from '../../../../common/mock';

const renderDescription = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProvidersComponent>
      <DocumentDetailsContext.Provider value={contextValue}>
        <EventCategoryDescription />
      </DocumentDetailsContext.Provider>
    </TestProvidersComponent>
  );

describe('<EventCategoryDescription />', () => {
  it('should render description for 1 category', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'file';
      }
    };
    const { getByTestId } = renderDescription({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-file`)).toBeInTheDocument();
  });

  it('should render description for multiple categories', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return ['file', 'network'];
      }
    };
    const { getByTestId } = renderDescription({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-file`)).toBeInTheDocument();
    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-network`)).toBeInTheDocument();
  });

  it('should render category name and fallback description if not ecs compliant', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'behavior';
      }
    };
    const { getByTestId } = renderDescription({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)).toHaveTextContent(
      "BehaviorThis field doesn't have a description because it's not part of ECS."
    );
  });
});
