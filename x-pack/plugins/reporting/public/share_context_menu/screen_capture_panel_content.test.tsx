/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { coreMock, themeServiceMock } from 'src/core/public/mocks';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ScreenCapturePanelContent } from './screen_capture_panel_content';

const { http, uiSettings, ...coreSetup } = coreMock.createSetup();
uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case 'dateFormat:tz':
      return 'Mars';
  }
});
const apiClient = new ReportingAPIClient(http, uiSettings, '7.15.0');

const getJobParamsDefault = () => ({
  objectType: 'test-object-type',
  title: 'Test Report Title',
  browserTimezone: 'America/New_York',
});

const theme = themeServiceMock.createSetupContract();

test('ScreenCapturePanelContent renders the default view properly', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        theme={theme}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).not.toMatch('Full page layout');
  expect(component.text()).not.toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent properly renders a view with "canvas" layout option', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        theme={theme}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Full page layout');
});

test('ScreenCapturePanelContent allows POST URL to be copied when objectId is provided', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        objectId={'1234-5'}
        theme={theme}
      />
    </IntlProvider>
  );
  expect(component.text()).toMatch('Copy POST URL');
  expect(component.text()).not.toMatch('Unsaved work');
});

test('ScreenCapturePanelContent does not allow POST URL to be copied when objectId is not provided', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        theme={theme}
      />
    </IntlProvider>
  );
  expect(component.text()).not.toMatch('Copy POST URL');
  expect(component.text()).toMatch('Unsaved work');
});

test('ScreenCapturePanelContent properly renders a view with "print" layout option', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="print"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        theme={theme}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent decorated job params are visible in the POST URL', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        objectId="test"
        reportType="Analytical App"
        requiresSavedState={false}
        isDirty={false}
        apiClient={apiClient}
        uiSettings={uiSettings}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
        theme={theme}
      />
    </IntlProvider>
  );

  expect(component.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
    `"http://localhost/api/reporting/generate/Analytical%20App?jobParams=%28browserTimezone%3AAmerica%2FNew_York%2Clayout%3A%28dimensions%3A%28height%3A768%2Cwidth%3A1024%29%2Cid%3Apreserve_layout%29%2CobjectType%3Atest-object-type%2Ctitle%3A%27Test%20Report%20Title%27%2Cversion%3A%277.15.0%27%29"`
  );
});
