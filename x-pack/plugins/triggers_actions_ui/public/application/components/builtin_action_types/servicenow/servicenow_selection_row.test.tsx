/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test/jest';

import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { ActionConnector } from '../../../../types';
import ServiceNowSelectableRowComponent from './servicenow_selection_row';

const connector: ActionConnector = {
  secrets: {},
  config: {
    usesTableApi: true,
  },
  id: 'test',
  actionTypeId: '.servicenow',
  name: 'Test',
  isPreconfigured: false,
};

describe('ServiceNowSelectableRowComponent', () => {
  it('adds deprecated to the connector title when its config is marked as deprecated', () => {
    render(
      <EuiThemeProvider>
        <ServiceNowSelectableRowComponent actionConnector={connector} />
      </EuiThemeProvider>
    );

    expect(screen.queryByText('Test (deprecated)')).toBeInTheDocument();
  });

  it('renders an icon marking the connector as deprecated when its config is marked as deprecated', () => {
    const wrapper = mountWithIntl(
      <EuiThemeProvider>
        <ServiceNowSelectableRowComponent actionConnector={connector} />
      </EuiThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="deprecated-connector-icon-test"]').exists()).toBeTruthy();
  });

  it('does not add the deprecated text to the connector title when it is not deprecated', () => {
    const nonDeprecatedConnector = { ...connector, config: { usesTableApi: false } };

    render(
      <EuiThemeProvider>
        <ServiceNowSelectableRowComponent actionConnector={nonDeprecatedConnector} />
      </EuiThemeProvider>
    );

    expect(screen.queryByText('Test')).toBeInTheDocument();
  });

  it('does not render an icon marking the connector as deprecated when its config is marked as not deprecated', () => {
    const nonDeprecatedConnector = { ...connector, config: { usesTableApi: false } };

    const wrapper = mountWithIntl(
      <EuiThemeProvider>
        <ServiceNowSelectableRowComponent actionConnector={nonDeprecatedConnector} />
      </EuiThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="deprecated-connector-icon-test"]').exists()).toBeFalsy();
  });
});
