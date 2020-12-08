/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import { MLJobLink } from '../ml_job_link';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';

const core = coreMock.createStart();
describe('ML JobLink', () => {
  it('shallow renders without errors', () => {
    const wrapper = shallowWithRouter(
      <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor" />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors', () => {
    const wrapper = renderWithRouter(
      <KibanaContextProvider
        services={{ ...core, triggersActionsUi: { getEditAlertFlyout: jest.fn() } }}
      >
        <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor" />
      </KibanaContextProvider>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
