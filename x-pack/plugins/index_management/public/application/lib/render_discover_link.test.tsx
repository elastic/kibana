/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButtonIcon } from '@elastic/eui';
import { renderDiscoverLink } from './render_discover_link';
import { AppContextProvider, AppDependencies } from '../app_context';

describe('renderDiscoverLink', () => {
  const indexName = 'my-fancy-index';

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
      <AppContextProvider value={ctx}>{renderDiscoverLink(indexName)}</AppContextProvider>
    );
    const button = component.find(EuiButtonIcon);

    await button.simulate('click');
    expect(navigateMock).toHaveBeenCalledWith({ dataViewSpec: { title: indexName } });
  });

  it('does not render a button if locators is not defined', () => {
    const ctx = {} as unknown as AppDependencies;

    const component = mountWithIntl(
      <AppContextProvider value={ctx}>{renderDiscoverLink(indexName)}</AppContextProvider>
    );
    const button = component.find(EuiButtonIcon);

    expect(button).toHaveLength(0);
  });
});
