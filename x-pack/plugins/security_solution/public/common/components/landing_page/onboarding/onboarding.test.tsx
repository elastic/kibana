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
import { useCurrentUser, useKibana } from '../../../lib/kibana';
import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

jest.mock('./toggle_panel');
jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
(useCurrentUser as jest.Mock).mockReturnValue({ fullName: 'UserFullName' });

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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    mockedContext = createAppRootMockRenderer();
    render = () => (renderResult = mockedContext.render(<OnboardingComponent {...props} />));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title, subtitle, and description', () => {
    render();

    const pageTitle = renderResult.getByText('Hi UserFullName!');
    const subtitle = renderResult.getByText(`Get started with Security`);
    const description = renderResult.getByText(
      `This area shows you everything you need to know. Feel free to explore all content. You can always come back here at any time.`
    );

    expect(pageTitle).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('should render welcomeHeader and TogglePanel', () => {
    render();

    const welcomeHeader = renderResult.getByTestId('welcome-header');
    const togglePanel = renderResult.getByTestId('toggle-panel');

    expect(welcomeHeader).toBeInTheDocument();
    expect(togglePanel).toBeInTheDocument();
  });

  it('should render dataIngestionHubHeader if dataIngestionHubEnabled flag is true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    render();

    const dataIngestionHubHeader = renderResult.getByTestId('data-ingestion-hub-header');

    expect(dataIngestionHubHeader).toBeInTheDocument();
  });

  describe('AVC 2024 Results banner', () => {
    it('should render on the page', () => {
      render();
      expect(renderResult.getByTestId('avcResultsBanner')).toBeTruthy();
    });

    it('should link to the blog post', () => {
      render();
      expect(renderResult.getByTestId('avcReadTheBlog')).toHaveAttribute(
        'href',
        'https://www.elastic.co/blog/elastic-security-malware-protection-test-av-comparatives'
      );
    });

    it('on closing the callout should store dismissal state in local storage', () => {
      render();
      renderResult.getByTestId('euiDismissCalloutButton').click();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
      expect(useKibana().services.storage.set).toHaveBeenCalledWith(
        'securitySolution.showAvcBanner',
        false
      );
    });
    it('should stay dismissed if it has been closed once', () => {
      (useKibana().services.storage.get as jest.Mock).mockReturnValue(false);
      render();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
    });
  });
});
