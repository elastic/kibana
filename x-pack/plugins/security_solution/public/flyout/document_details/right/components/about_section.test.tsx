/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  ABOUT_SECTION_CONTENT_TEST_ID,
  ABOUT_SECTION_HEADER_TEST_ID,
  ALERT_DESCRIPTION_TITLE_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_CATEGORY_DESCRIPTION_TEST_ID,
} from './test_ids';
import { TestProviders } from '../../../../common/mock';
import { AboutSection } from './about_section';
import { RightPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';

jest.mock('../../../../common/components/link_to');

const renderAboutSection = (expanded: boolean = false) => {
  const mockGetFieldsData = (field: string) => {
    switch (field) {
      case 'event.kind':
        return 'signal';
    }
  };
  return render(
    <TestProviders>
      <RightPanelContext.Provider value={{ ...mockContextValue, getFieldsData: mockGetFieldsData }}>
        <AboutSection expanded={expanded} />
      </RightPanelContext.Provider>
    </TestProviders>
  );
};

describe('<AboutSection />', () => {
  it('should render the component collapsed', async () => {
    const { getByTestId } = renderAboutSection();
    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the component expanded', async () => {
    const { getByTestId } = renderAboutSection(true);
    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should expand the component when clicking on the arrow on header', async () => {
    const { getByTestId } = renderAboutSection();
    await act(async () => {
      getByTestId(ABOUT_SECTION_HEADER_TEST_ID).click();
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render about section for signal document', async () => {
    const { getByTestId } = renderAboutSection(true);
    await act(async () => {
      expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render event kind description if event.kind is not event', async () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
        case 'event.category':
          return 'behavior';
      }
    };
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider
          value={{
            ...mockContextValue,
            getFieldsData: mockGetFieldsData,
          }}
        >
          <AboutSection expanded />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    await act(async () => {
      expect(queryByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render event category description if event.kind is event', async () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'behavior';
      }
    };
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider
          value={{
            ...mockContextValue,
            getFieldsData: mockGetFieldsData,
          }}
        >
          <AboutSection expanded />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    await act(async () => {
      expect(queryByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)).toBeInTheDocument();
    });
  });
});
