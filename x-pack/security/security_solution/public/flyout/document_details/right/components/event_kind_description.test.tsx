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
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEXT_TEST_ID,
  EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID,
} from './test_ids';
import { EventKindDescription } from './event_kind_description';
import { mockContextValue } from '../mocks/mock_context';
import { TestProvidersComponent } from '../../../../common/mock';

const renderDescription = (contextValue: RightPanelContext) =>
  render(
    <TestProvidersComponent>
      <RightPanelContext.Provider value={contextValue}>
        <EventKindDescription eventKind="alert" />
      </RightPanelContext.Provider>
    </TestProvidersComponent>
  );

describe('<EventKindDescription />', () => {
  describe('event kind description section', () => {
    it('should render event kind title', () => {
      const { getByTestId } = renderDescription(mockContextValue);
      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEXT_TEST_ID)).toHaveTextContent('Alert');
    });
  });

  describe('event categories section', () => {
    it('should render event category correctly for 1 category', () => {
      const mockGetFieldsData = (field: string) => {
        switch (field) {
          case 'event.category':
            return 'behavior';
        }
      };
      const { getByTestId } = renderDescription({
        ...mockContextValue,
        getFieldsData: mockGetFieldsData,
      });

      expect(getByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).toHaveTextContent('behavior');
    });

    it('should render event category for multiple categories', () => {
      const mockGetFieldsData = (field: string) => {
        switch (field) {
          case 'event.category':
            return ['session', 'authentication'];
        }
      };
      const { getByTestId } = renderDescription({
        ...mockContextValue,
        getFieldsData: mockGetFieldsData,
      });

      expect(getByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).toHaveTextContent(
        'session,authentication'
      );
    });

    it('should not render category name if not available', () => {
      const { queryByTestId } = renderDescription(mockContextValue);

      expect(queryByTestId(EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
