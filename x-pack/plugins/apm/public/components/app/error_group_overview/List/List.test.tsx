/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { mockMoment, toJson } from '../../../../utils/testHelpers';
import { ErrorGroupList } from './index';
import props from './__fixtures__/props.json';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const storeState = {};
    const wrapper = mount(
      <MemoryRouter>
        <MockUrlParamsContextProvider>
          <ErrorGroupList items={[]} serviceName="opbeans-python" />
        </MockUrlParamsContextProvider>
      </MemoryRouter>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <MemoryRouter>
          <MockApmPluginContextWrapper>
            <MockUrlParamsContextProvider>
              <ErrorGroupList
                items={props.items}
                serviceName="opbeans-python"
              />
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      </EuiThemeProvider>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
