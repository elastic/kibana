/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButtonIcon } from '@elastic/eui';
import { DiscoverLink } from './discover_link';
import { AppContextProvider, AppDependencies } from '../app_context';

describe('DiscoverLink', () => {
  const indexName = 'my-fancy-index';

  it('renders the link as an icon by default', async () => {
    const navigateMock = jest.fn();
    const ctx = {
      url: {
        locators: {
          get: () => ({ navigate: navigateMock }),
        },
      },
    } as unknown as AppDependencies;

    const component = mountWithIntl(
      <AppContextProvider value={ctx}>
        <DiscoverLink indexName={indexName} />
      </AppContextProvider>
    );

    expect(component.exists('[data-test-subj="discoverIconLink"]')).toBe(true);
    expect(component.exists('[data-test-subj="discoverButtonLink"]')).toBe(false);
  });

  it('renders the link as a button if the prop is set', async () => {
    const navigateMock = jest.fn();
    const ctx = {
      url: {
        locators: {
          get: () => ({ navigate: navigateMock }),
        },
      },
    } as unknown as AppDependencies;

    const component = mountWithIntl(
      <AppContextProvider value={ctx}>
        <DiscoverLink indexName={indexName} asButton={true} />
      </AppContextProvider>
    );

    expect(component.exists('[data-test-subj="discoverIconLink"]')).toBe(false);
    expect(component.exists('[data-test-subj="discoverButtonLink"]')).toBe(true);
  });

  it('calls navigate method when button is clicked', async () => {
    const navigateMock = jest.fn();
    const ctx = {
      url: {
        locators: {
          get: () => ({ navigate: navigateMock }),
        },
      },
    } as unknown as AppDependencies;

    const component = mountWithIntl(
      <AppContextProvider value={ctx}>
        <DiscoverLink indexName={indexName} />
      </AppContextProvider>
    );
    const button = component.find(EuiButtonIcon);

    await button.simulate('click');
    expect(navigateMock).toHaveBeenCalledWith({ dataViewSpec: { title: indexName } });
  });

  it('does not render a button if locators is not defined', () => {
    const ctx = {} as unknown as AppDependencies;

    const component = mountWithIntl(
      <AppContextProvider value={ctx}>
        <DiscoverLink indexName={indexName} />
      </AppContextProvider>
    );
    const button = component.find(EuiButtonIcon);

    expect(button).toHaveLength(0);
  });
});
