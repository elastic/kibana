/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { OnboardingComponent } from './onboarding';
import {
  AddIntegrationsSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from './types';
import { ProductLine, ProductTier } from './configs';
jest.mock('./toggle_panel');
jest.mock('./hooks/use_project_features_url');
jest.mock('./hooks/use_projects_url');
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');
  return {
    ...original,
    useCurrentUser: jest.fn().mockReturnValue({ fullName: 'UserFullName' }),
    useAppUrl: jest.fn().mockReturnValue({ getAppUrl: jest.fn().mockReturnValue('mock url') }),
  };
});
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: jest.fn().mockReturnValue({
      euiTheme: {
        base: 16,
        size: { xs: '4px', m: '12px', l: '24px', xl: '32px', xxl: '40px' },
        colors: { lightestShade: '' },
        font: {
          weight: { bold: 700 },
        },
      },
    }),
  };
});
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({ hash: '#watch_the_overview_video' }),
}));
jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn().mockReturnValue({ navigateTo: jest.fn() }),
  SecurityPageName: {
    landing: 'landing',
  },
}));

describe('OnboardingComponent', () => {
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
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title, subtitle, and description', () => {
    const { getByText } = render(<OnboardingComponent {...props} />);

    const pageTitle = getByText('Hi UserFullName!');
    const subtitle = getByText(`Get started with Security`);
    const description = getByText(
      `This area shows you everything you need to know. Feel free to explore all content. You can always come back here at any time.`
    );

    expect(pageTitle).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('should render welcomeHeader and TogglePanel', () => {
    const { getByTestId } = render(<OnboardingComponent {...props} />);

    const welcomeHeader = getByTestId('welcome-header');
    const togglePanel = getByTestId('toggle-panel');

    expect(welcomeHeader).toBeInTheDocument();
    expect(togglePanel).toBeInTheDocument();
  });
});
