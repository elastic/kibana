/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { coreMock } from '../../../../../src/core/public/mocks';
import { BaseParams } from '../../common/types';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ScreenCapturePanelContent } from './screen_capture_panel_content';

const getJobParamsDefault: () => BaseParams = () => ({
  objectType: 'test-object-type',
  title: 'Test Report Title',
  browserTimezone: 'America/New_York',
});

test('ScreenCapturePanelContent renders the default view properly', () => {
  const coreSetup = coreMock.createSetup();
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={new ReportingAPIClient(coreSetup.http)}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).not.toMatch('Full page layout');
  expect(component.text()).not.toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent properly renders a view with "canvas" layout option', () => {
  const coreSetup = coreMock.createSetup();
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={new ReportingAPIClient(coreSetup.http)}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Full page layout');
});

test('ScreenCapturePanelContent properly renders a view with "print" layout option', () => {
  const coreSetup = coreMock.createSetup();
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="print"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={new ReportingAPIClient(coreSetup.http)}
        toasts={coreSetup.notifications.toasts}
        getJobParams={getJobParamsDefault}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm')).toMatchSnapshot();
  expect(component.text()).toMatch('Optimize for printing');
});
