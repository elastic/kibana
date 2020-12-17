/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageHeader } from '../page_header';
import { createMemoryHistory } from 'history';
import { renderWithRouter, MountWithReduxProvider } from '../../../../lib';
import { AppState, store } from '../../../../state';

describe('PageHeader', () => {
  const monitorName = 'sample monitor';
  const initialState = store.getState();
  const state: AppState = {
    ...initialState,
    monitorStatus: {
      loading: false,
      status: {
        docId: '',
        timestamp: '',
        monitor: {
          duration: { us: 0 },
          id: '',
          status: '',
          type: '',
          ...initialState?.monitorStatus?.status,
          name: monitorName,
        },
      },
    },
  };

  it('shallow renders with the date picker', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_date_picker');
  });

  it('shallow renders without the date picker', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_no_date_picker');
  });

  it('shallow renders extra links', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_extra_links');
  });

  it('renders null when on a step detail page', () => {
    const history = createMemoryHistory();
    // navigate to step page
    history.push('/journey/1/step/1');
    const component = renderWithRouter(
      <MountWithReduxProvider store={state}>
        <PageHeader />
      </MountWithReduxProvider>,
      history
    );
    expect(component.html()).toBe(null);
  });

  it('renders monitor header without tabs when on a monitor page', () => {
    const history = createMemoryHistory();
    // navigate to monitor page
    history.push('/monitor/1');
    const component = renderWithRouter(
      <MountWithReduxProvider store={state}>
        <PageHeader />
      </MountWithReduxProvider>,
      history
    );
    expect(component.find('h1').text()).toBe(monitorName);
    expect(component.find('[data-test-subj="uptimeSettingsToOverviewLink"]').length).toBe(0);
    expect(component.find('[data-test-subj="uptimeCertificatesLink"]').length).toBe(0);
    expect(component.find('[data-test-subj="settings-page-link"]').length).toBe(0);
  });

  it('renders tabs when not on a monitor or step detail page', () => {
    const history = createMemoryHistory();
    const component = renderWithRouter(
      <MountWithReduxProvider store={state}>
        <PageHeader />
      </MountWithReduxProvider>,
      history
    );
    expect(component.find('[data-test-subj="uptimeSettingsToOverviewLink"]').length).toBe(1);
    expect(component.find('[data-test-subj="uptimeCertificatesLink"]').length).toBe(1);
    expect(component.find('[data-test-subj="settings-page-link"]').length).toBe(1);
  });
});
