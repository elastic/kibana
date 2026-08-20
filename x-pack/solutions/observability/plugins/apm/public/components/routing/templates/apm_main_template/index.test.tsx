/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { ApmMainTemplate } from '.';

const mockUseApmAppMenuConfig = jest.fn((): AppMenuConfig | undefined => undefined);
const mockRegisterAppMenu = jest.fn(({ config }: { config: AppMenuConfig }) => null);

jest.mock('@kbn/core-chrome-browser-hooks', () => ({
  ...jest.requireActual('@kbn/core-chrome-browser-hooks'),
  RegisterAppMenu: (props: { config: AppMenuConfig }) => mockRegisterAppMenu(props),
}));

jest.mock('../../app_root/apm_app_menu/apm_app_menu_context', () => ({
  useApmAppMenuConfig: () => mockUseApmAppMenuConfig(),
}));

const mockPageTemplate = jest.fn(
  ({ children, pageHeader }: { children: React.ReactNode; pageHeader?: unknown }) => (
    <div data-test-subj="mockObservabilityPageTemplate">
      {pageHeader ? <div data-test-subj="legacyPageHeader" /> : null}
      {children}
    </div>
  )
);

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  useFetcher: () => ({ data: { hasData: true }, status: 'success' }),
}));

jest.mock('../../../../hooks/use_default_ai_assistant_starter_prompts_for_apm', () => ({
  useDefaultAiAssistantStarterPromptsForAPM: () => {},
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: { links: { observability: { guide: 'https://example.com' } } },
      observabilityShared: {
        navigation: { PageTemplate: mockPageTemplate },
      },
      application: { capabilities: { savedObjectsManagement: { edit: false } } },
      share: { url: { locators: { get: () => undefined } } },
    },
  }),
}));

const registeredMenu: AppMenuConfig = {
  items: [
    {
      id: 'settings',
      label: 'Settings',
      href: '/app/apm/settings',
      iconType: 'gear',
      testId: 'apmSettingsHeaderLink',
    },
  ],
  primaryActionItem: {
    id: 'addData',
    label: 'Add data',
    href: '/add-data',
    iconType: 'plusCircle',
    testId: 'apmAddDataHeaderLink',
  },
};

function renderTemplate(ui: React.ReactElement) {
  const history = createMemoryHistory({ initialEntries: ['/services'] });
  return render(
    <MockAppHeaderProvider>
      <Router history={history}>{ui}</Router>
    </MockAppHeaderProvider>
  );
}

describe('ApmMainTemplate', () => {
  beforeEach(() => {
    mockPageTemplate.mockClear();
    mockRegisterAppMenu.mockClear();
    mockUseApmAppMenuConfig.mockReturnValue(undefined);
  });

  it('renders AppHeader without a legacy pageHeader when header prop is set', () => {
    renderTemplate(
      <ApmMainTemplate header={{ title: 'Service inventory' }} searchBar={<div>search</div>}>
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Service inventory'
    );
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.queryByTestId('legacyPageHeader')).not.toBeInTheDocument();

    expect(mockPageTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSectionProps: expect.objectContaining({ paddingSize: 'none' }),
      }),
      expect.anything()
    );
  });

  it('keeps the legacy pageHeader path when header prop is omitted', () => {
    renderTemplate(
      <ApmMainTemplate pageTitle="Legacy title">
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId('legacyPageHeader')).toBeInTheDocument();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();
  });

  it('merges the registered app menu into AppHeader on migrated pages', async () => {
    mockUseApmAppMenuConfig.mockReturnValue(registeredMenu);

    renderTemplate(
      <ApmMainTemplate header={{ title: 'Dependencies' }}>
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Dependencies');
    // primaryActionItem stays outside the overflow limit and is always visible on the title row
    expect(await screen.findByTestId('apmAddDataHeaderLink')).toBeInTheDocument();
    // Migrated pages must not register chrome.setAppMenu (avoids classic breadcrumb-bar duplicate)
    expect(mockRegisterAppMenu).not.toHaveBeenCalled();
  });

  it('composes page-local menu items with the registered app menu', async () => {
    mockUseApmAppMenuConfig.mockReturnValue(registeredMenu);

    renderTemplate(
      <ApmMainTemplate
        header={{
          title: 'opbeans-java',
          menu: {
            items: [
              {
                id: 'exploreData',
                label: 'Explore data',
                href: '/explore',
                iconType: 'chartBarVerticalStack',
                testId: 'apmAnalyzeDataButtonExploreDataButton',
              },
            ],
          },
        }}
      >
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('opbeans-java');
    // Global primary is preserved when the page only adds items
    expect(await screen.findByTestId('apmAddDataHeaderLink')).toBeInTheDocument();
    expect(mockRegisterAppMenu).not.toHaveBeenCalled();
  });

  it('lets Explore data as primaryActionItem replace Add data on the title row', async () => {
    mockUseApmAppMenuConfig.mockReturnValue(registeredMenu);

    renderTemplate(
      <ApmMainTemplate
        header={{
          title: 'elastic-co-frontend',
          menu: {
            primaryActionItem: {
              id: 'exploreData',
              label: 'Explore data',
              href: '/explore',
              iconType: 'chartBarVerticalStack',
              testId: 'apmAnalyzeDataButtonExploreDataButton',
            },
          },
        }}
      >
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(await screen.findByTestId('apmAnalyzeDataButtonExploreDataButton')).toBeInTheDocument();
    expect(screen.queryByTestId('apmAddDataHeaderLink')).not.toBeInTheDocument();
  });

  it('lets page-local primaryActionItem replace Add data on the title row', async () => {
    mockUseApmAppMenuConfig.mockReturnValue(registeredMenu);

    renderTemplate(
      <ApmMainTemplate
        header={{
          title: 'My group',
          menu: {
            primaryActionItem: {
              id: 'editServiceGroup',
              label: 'Edit group',
              iconType: 'pencil',
              testId: 'apmEditButtonEditGroupButton',
              run: () => {},
            },
          },
        }}
      >
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(await screen.findByTestId('apmEditButtonEditGroupButton')).toBeInTheDocument();
    expect(screen.queryByTestId('apmAddDataHeaderLink')).not.toBeInTheDocument();
  });

  it('registers the app menu with chrome on the legacy pageHeader path', () => {
    mockUseApmAppMenuConfig.mockReturnValue(registeredMenu);

    renderTemplate(
      <ApmMainTemplate pageTitle="Legacy title">
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId('legacyPageHeader')).toBeInTheDocument();
    expect(mockRegisterAppMenu).toHaveBeenCalledWith(
      expect.objectContaining({ config: registeredMenu })
    );
  });
});
