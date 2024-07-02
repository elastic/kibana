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
import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';
import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';
import { createSecuritySolutionStorageMock } from '../../../mock/mock_local_storage';
// import type { MockStorage } from '../../../lib/local_storage/__mocks__';
// import { storage } from '../../../lib/local_storage';

jest.mock('./toggle_panel');
jest.mock('../../../lib/kibana');
// jest.mock('../../../lib/local_storage');

(useCurrentUser as jest.Mock).mockReturnValue({ fullName: 'UserFullName' });

const mockedUseKibana = mockUseKibana();
// const { storage: storageMock } = createSecuritySolutionStorageMock();

describe('OnboardingComponent', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let { storage: mockedStorage } = createSecuritySolutionStorageMock();
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
    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        // storage: storageMock,
        storage: mockedStorage,
      },
    });
    mockedContext = createAppRootMockRenderer();
    render = () => (renderResult = mockedContext.render(<OnboardingComponent {...props} />));
  });

  afterEach(() => {
    // storageMock.clear();
    mockedStorage.clear();
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

    it('should stay stay dismissed', () => {
      // storage.get.mockReturnValue(false);
      render();
      renderResult.getByTestId('euiDismissCalloutButton').click();
      expect(renderResult.queryByTestId('avcResultsBanner')).toBeNull();
      expect(mockedStorage.set).toHaveBeenCalledWith('securitySolution.showAvcBanner', 'false');
      // need to test local storage key presence or refresh and banner is not present
    });
  });
});
