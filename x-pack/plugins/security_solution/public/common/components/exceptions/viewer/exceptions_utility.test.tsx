/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionsViewerUtility } from './exceptions_utility';

describe('ExceptionsViewerUtility', () => {
  it('it renders correct pluralized text when more than one exception exists', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 2,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: false,
            showDetectionsList: false,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsShowing"]').at(0).text()).toEqual(
      'Showing 2 exceptions'
    );
  });

  it('it renders correct singular text when less than two exceptions exists', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: false,
            showDetectionsList: false,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsShowing"]').at(0).text()).toEqual(
      'Showing 1 exception'
    );
  });

  it('it invokes "onRefreshClick" when refresh button clicked', () => {
    const mockOnRefreshClick = jest.fn();
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: false,
            showDetectionsList: false,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={mockOnRefreshClick}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsRefresh"] button').simulate('click');

    expect(mockOnRefreshClick).toHaveBeenCalledTimes(1);
  });

  it('it does not render any messages when "showEndpointList" and "showDetectionsList" are "false"', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: false,
            showDetectionsList: false,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEndpointMessage"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsDetectionsMessage"]').exists()).toBeFalsy();
  });

  it('it does render detections messages when "showDetectionsList" is "true"', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: false,
            showDetectionsList: true,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEndpointMessage"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsDetectionsMessage"]').exists()).toBeTruthy();
  });

  it('it does render endpoint messages when "showEndpointList" is "true"', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          filterOptions={{
            filter: '',
            showEndpointList: true,
            showDetectionsList: false,
            tags: [],
          }}
          ruleSettingsUrl={'some/url'}
          onRefreshClick={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEndpointMessage"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionsDetectionsMessage"]').exists()).toBeFalsy();
  });
});
