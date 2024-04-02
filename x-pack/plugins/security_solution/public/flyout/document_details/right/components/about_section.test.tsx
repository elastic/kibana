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
  REASON_TITLE_TEST_ID,
  MITRE_ATTACK_TITLE_TEST_ID,
} from './test_ids';
import { TestProviders } from '../../../../common/mock';
import { AboutSection } from './about_section';
import { RightPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';
import { useExpandSection } from '../hooks/use_expand_section';

jest.mock('../../../../common/components/link_to');
jest.mock('../hooks/use_expand_section');

const mockGetFieldsData: (field: string) => string = (field: string) => {
  switch (field) {
    case 'event.kind':
      return 'signal';
    default:
      return '';
  }
};

const renderAboutSection = (getFieldsData = mockGetFieldsData) => {
  const contextValue = {
    ...mockContextValue,
    getFieldsData,
  };
  return render(
    <TestProviders>
      <RightPanelContext.Provider value={contextValue}>
        <AboutSection />
      </RightPanelContext.Provider>
    </TestProviders>
  );
};

describe('<AboutSection />', () => {
  it('should render about component', async () => {
    const { getByTestId } = renderAboutSection();
    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ABOUT_SECTION_HEADER_TEST_ID)).toHaveTextContent('About');
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render the component collapsed if value is false in local storage', async () => {
    (useExpandSection as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderAboutSection();
    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
    });
  });

  it('should render the component expanded if value is true in local storage', async () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderAboutSection();
    await act(async () => {
      expect(getByTestId(ABOUT_SECTION_CONTENT_TEST_ID)).toBeVisible();
    });
  });

  it('should render about section for signal document', async () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderAboutSection();
    await act(async () => {
      expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render event kind description if event.kind is not event', async () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    const _mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
        case 'event.category':
          return 'behavior';
        default:
          return '';
      }
    };

    const { getByTestId, queryByTestId } = renderAboutSection(_mockGetFieldsData);
    await act(async () => {
      expect(queryByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(REASON_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(MITRE_ATTACK_TITLE_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).toBeInTheDocument();

      expect(
        queryByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)
      ).not.toBeInTheDocument();
    });
  });

  it('should render event category description if event.kind is event', async () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    const _mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'behavior';
        default:
          return '';
      }
    };

    const { getByTestId, queryByTestId } = renderAboutSection(_mockGetFieldsData);
    await act(async () => {
      expect(queryByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(REASON_TITLE_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(MITRE_ATTACK_TITLE_TEST_ID)).not.toBeInTheDocument();

      expect(queryByTestId(EVENT_KIND_DESCRIPTION_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-behavior`)).toBeInTheDocument();
    });
  });
});
