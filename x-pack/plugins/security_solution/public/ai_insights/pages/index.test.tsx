/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { AssistantAvailability } from '@kbn/elastic-assistant';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { Router } from '@kbn/shared-ux-router';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../common/mock';
import { MockAssistantProvider } from '../../common/mock/mock_assistant_provider';
import { AI_INSIGHTS_PATH } from '../../../common/constants';
import { mockHistory } from '../../common/utils/route/mocks';
import { AiInsights } from '.';
import { mockTimelines } from '../../common/mock/mock_timelines_plugin';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { mockFindAnonymizationFieldsResponse } from '../mock/mock_find_anonymization_fields_response';
import {
  getMockUseInsightsWithCachedInsights,
  getMockUseInsightsWithNoInsightsLoading,
} from '../mock/mock_use_insights';
import { AI_INSIGHTS_PAGE_TITLE } from './page_title/translations';
import { useInsights } from '../use_insights';

jest.mock('react-use', () => {
  const actual = jest.requireActual('react-use');

  return {
    ...actual,
    useLocalStorage: jest.fn().mockReturnValue([undefined, jest.fn()]),
    useSessionStorage: jest.fn().mockReturnValue([undefined, jest.fn()]),
  };
});

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: jest.fn(() => mockFindAnonymizationFieldsResponse),
  })
);

jest.mock('../../common/links', () => ({
  useLinkInfo: jest.fn().mockReturnValue({
    capabilities: ['siem.show'],
    experimentalKey: 'assistantAlertsInsights',
    globalNavPosition: 4,
    globalSearchKeywords: ['AI Insights'],
    id: 'ai_insights',
    path: '/ai_insights',
    title: 'AI Insights',
  }),
}));

jest.mock('../use_insights', () => ({
  useInsights: jest.fn().mockReturnValue({
    approximateFutureTime: null,
    cachedInsights: {},
    fetchInsights: jest.fn(),
    generationIntervals: undefined,
    insights: [],
    lastUpdated: null,
    replacements: {},
    isLoading: false,
  }),
}));

const mockFilterManager = createFilterManagerMock();

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const mockDataViewsService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

const mockUpselling = new UpsellingService();

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
          },
          navigateToUrl: jest.fn(),
        },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              all: true,
              connectors: true,
              create: true,
              delete: true,
              push: true,
              read: true,
              settings: true,
              update: true,
            }),
          },
          hooks: {
            useCasesAddToExistingCase: jest.fn(),
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: jest.fn() }),
            useCasesAddToNewCaseFlyout: jest.fn(),
          },
          ui: { getCasesContext: mockCasesContext },
        },
        data: {
          query: {
            filterManager: mockFilterManager,
          },
        },
        dataViews: mockDataViewsService,
        docLinks: {
          links: {
            siem: {
              privileges: 'link',
            },
          },
        },
        notifications: jest.fn().mockReturnValue({
          addError: jest.fn(),
          addSuccess: jest.fn(),
          addWarning: jest.fn(),
          remove: jest.fn(),
        }),
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
        },
        theme: {
          getTheme: jest.fn().mockReturnValue({ darkMode: false }),
        },
        timelines: { ...mockTimelines },
        triggersActionsUi: {
          alertsTableConfigurationRegistry: {},
          getAlertsStateTable: () => <></>,
        },
        uiSettings: {
          get: jest.fn(),
        },
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

const historyMock = {
  ...mockHistory,
  location: {
    hash: '',
    pathname: AI_INSIGHTS_PATH,
    search: '',
    state: '',
  },
};

describe('AiInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('page layout', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AiInsights />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('renders the expected page title', () => {
      expect(screen.getByTestId('aiInsightsPageTitle')).toHaveTextContent(AI_INSIGHTS_PAGE_TITLE);
    });

    it('renders the header', () => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('when there are no insights', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AiInsights />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });

    it('does NOT render insights', () => {
      expect(screen.queryAllByTestId('insight')).toHaveLength(0);
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when there are insights', () => {
    const mockUseInsightsResults = getMockUseInsightsWithCachedInsights(jest.fn());
    const { insights } = mockUseInsightsResults;

    beforeEach(() => {
      (useInsights as jest.Mock).mockReturnValue(mockUseInsightsResults);

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AiInsights />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('renders the summary', () => {
      expect(screen.getByTestId('summary')).toBeInTheDocument();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the expected number of insights', () => {
      expect(screen.queryAllByTestId('insight')).toHaveLength(insights.length);
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      (useInsights as jest.Mock).mockReturnValue(
        getMockUseInsightsWithNoInsightsLoading(jest.fn()) // <-- loading
      );

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AiInsights />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('renders the loading callout', () => {
      expect(screen.getByTestId('loadingCallout')).toBeInTheDocument();
    });

    it('does NOT render insights', () => {
      expect(screen.queryAllByTestId('insight')).toHaveLength(0);
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when the user does not have an Enterprise license', () => {
    const assistantUnavailable: AssistantAvailability = {
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: false, // <-- non-Enterprise license
    };

    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <MockAssistantProvider assistantAvailability={assistantUnavailable}>
                <AiInsights />
              </MockAssistantProvider>
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the header', () => {
      expect(screen.queryByTestId('header')).toBeNull();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render insights', () => {
      expect(screen.queryAllByTestId('insight')).toHaveLength(0);
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the upgrade call to action', () => {
      expect(screen.getByTestId('upgrade')).toBeInTheDocument();
    });
  });
});
