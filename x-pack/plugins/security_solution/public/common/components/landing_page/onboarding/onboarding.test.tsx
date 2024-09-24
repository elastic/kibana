/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { OnboardingComponent } from './onboarding';
import {
  AddIntegrationsSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from './types';
import { ProductLine, ProductTier } from './configs';
import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';
import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';

const mockedUseKibana = mockUseKibana();
const mockedStorageGet = jest.fn();
const mockedStorageSet = jest.fn();

jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useCurrentUser: jest.fn().mockReturnValue({ fullName: 'UserFullName' }),
    useKibana: () => ({
      mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        storage: {
          ...mockedUseKibana.services.storage,
          get: mockedStorageGet,
          set: mockedStorageSet,
        },
      },
    }),
  };
});

jest.mock('./toggle_panel');

describe('OnboardingComponent', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const props = {
    indicesExist: true,
    productTypes: [{ product_line: ProductLine.security, product_tier: ProductTier.complete }],
    onboardingSteps: [
      OverviewSteps.getToKnowElasticSecurity,
      AddIntegrationsSteps.connectToDataSources,
      ViewDashboardSteps.analyzeData,
      EnablePrebuiltRulesSteps.enablePrebuiltRules,
      ViewAlertsSteps.viewAlerts,
    ],
    spaceId: 'spaceId',
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = () => (renderResult = mockedContext.render(<OnboardingComponent {...props} />));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title, subtitle, and description', () => {
    render();

    const pageTitle = renderResult.getByText('Hi UserFullName!');
    const subtitle = renderResult.getByText(`Welcome to Elastic Security`);
    const description = renderResult.getByText(`Follow these steps to set up your workspace.`);

    expect(pageTitle).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('should render dataIngestionHubHeader and TogglePanel', () => {
    render();
    const dataIngestionHubHeader = renderResult.getByTestId('data-ingestion-hub-header');
    const togglePanel = renderResult.getByTestId('toggle-panel');

    expect(dataIngestionHubHeader).toBeInTheDocument();
    expect(togglePanel).toBeInTheDocument();
  });

  describe('AVC 2024 Results banner', () => {
    beforeEach(() => {
      mockedStorageGet.mockReturnValue(true);
    });
    afterEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
    });
    it('should render on the page', () => {
      render();
      expect(renderResult.getByTestId('avcResultsBanner')).toBeTruthy();
    });

    it('should link to the blog post', () => {
      render();
      expect(renderResult.getByTestId('avcReadTheBlog')).toHaveAttribute(
        'href',
        'https://www.elastic.co/blog/elastic-av-comparatives-business-security-test'
      );
    });

    it('on closing the callout should store dismissal state in local storage', () => {
      render();
      renderResult.getByTestId('euiDismissCalloutButton').click();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
      expect(mockedStorageSet).toHaveBeenCalledWith('securitySolution.showAvcBanner', false);
    });

    it('should stay dismissed if it has been closed once', () => {
      mockedStorageGet.mockReturnValueOnce(false);
      render();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
    });

    it('should not be shown if the current date is January 1, 2025', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01T05:00:00.000Z'));
      render();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
      jest.useRealTimers();
    });
    it('should be shown if the current date is before January 1, 2025', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-12-31T05:00:00.000Z'));
      render();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeTruthy();
    });
  });
});
