/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import * as pluginContext from '../../hooks/use_plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AlertDetailsPage } from '.';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { createMemoryHistory } from 'history';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ alertId: 'foo' }),
}));

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
}));

const history = createMemoryHistory({ initialEntries: ['/alerts'] });

describe('Alert Details Page', () => {
  const renderComp = () =>
    render(
      <I18nProvider>
        <Router history={history}>
          <AlertDetailsPage />
        </Router>
      </I18nProvider>
    );

  it('Supports viewing / editing of rule conditions', async () => {
    const { getByTestId } = renderComp();

    const actionsButton = getByTestId('alert-details-actions-menu-button');

    fireEvent.click(actionsButton);

    const editRuleConditionsButton = getByTestId('edit-rule-conditions-button');

    fireEvent.click(editRuleConditionsButton);

    expect(history.location.pathname).toBe('/alerts/rules/foo');
  });

  it('Supports adding alert to existing case', () => {
    const { getByTestId } = renderComp();

    const actionsButton = getByTestId('alert-details-actions-menu-button');

    fireEvent.click(actionsButton);

    const addToExistingCaseButton = getByTestId('add-to-existing-case-button');

    fireEvent.click(addToExistingCaseButton);

    expect(history.location.pathname).toBe('/cases');
  });

  it('Supports adding alert to a new case', () => {
    const { getByTestId } = renderComp();

    const actionsButton = getByTestId('alert-details-actions-menu-button');

    fireEvent.click(actionsButton);

    const editRuleConditionsButton = getByTestId('create-new-case-button');

    fireEvent.click(editRuleConditionsButton);

    expect(history.location.pathname).toBe('/cases/create');
  });
});
