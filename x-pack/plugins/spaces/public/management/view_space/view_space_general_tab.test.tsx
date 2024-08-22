/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  httpServiceMock,
  notificationServiceMock,
  overlayServiceMock,
  scopedHistoryMock,
} from '@kbn/core/public/mocks';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ViewSpaceContextProvider } from './hooks/view_space_context_provider';
import { ViewSpaceSettings } from './view_space_general_tab';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';

const space = { id: 'default', name: 'Default', disabledFeatures: [], _reserved: true };
const history = scopedHistoryMock.create();
const getUrlForApp = (appId: string) => appId;
const navigateToUrl = jest.fn();
const spacesManager = spacesManagerMock.create();
const getRolesAPIClient = getRolesAPIClientMock();

describe('ViewSpaceSettings', () => {
  const TestComponent: React.FC = ({ children }) => {
    return (
      <IntlProvider locale="en">
        <ViewSpaceContextProvider
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
          }}
          getUrlForApp={getUrlForApp}
          navigateToUrl={navigateToUrl}
          serverBasePath=""
          spacesManager={spacesManager}
          getRolesAPIClient={getRolesAPIClient}
          http={httpServiceMock.createStartContract()}
          notifications={notificationServiceMock.createStartContract()}
          overlays={overlayServiceMock.createStartContract()}
        >
          {children}
        </ViewSpaceContextProvider>
      </IntlProvider>
    );
  };

  it('should render matching snapshot', () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionSpaceText')).toBeInTheDocument();
    expect(screen.getByTestId('spaceLetterInitial')).toBeInTheDocument();
    expect(screen.getByTestId('euiColorPickerAnchor')).toBeInTheDocument();
  });

  it('shows solution view select when visible', async () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('solutionViewSelect')).toBeInTheDocument();
  });

  it('hides solution view select when not visible', async () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
        />
      </TestComponent>
    );

    expect(screen.queryByTestId('solutionViewSelect')).not.toBeInTheDocument();
  });

  it('shows feature visibility controls when allowed', async () => {
    const features = [
      new KibanaFeature({
        id: 'feature-1',
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={false}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('enabled-features-panel')).toBeInTheDocument();
  });

  it('hides feature visibility controls when not allowed', async () => {
    render(
      <TestComponent>
        <ViewSpaceSettings
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
        />
      </TestComponent>
    );

    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();
  });

  it.skip('allows a space to be updated', async () => {
    // TODO
  });

  it.skip('sets calculated fields for existing spaces', async () => {
    // TODO
  });

  it.skip('notifies when there is an error retrieving features', async () => {
    // TODO
  });

  it.skip('warns when updating features in the active space', async () => {
    // TODO
  });

  it.skip('does not warn when features are left alone in the active space', async () => {
    // TODO
  });
});
