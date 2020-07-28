/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContext } from '../';
import { mockKibanaContext } from './kibana_context.mock';
import { LicenseContext } from '../shared/licensing';
import { mockLicenseContext } from './license_context.mock';

/**
 * This helper mounts a component with all the contexts/providers used
 * by the production app, while allowing custom context to be
 * passed in via a second arg
 *
 * Example usage:
 *
 * const wrapper = mountWithContext(<Component />, { enterpriseSearchUrl: 'someOverride', license: {} });
 */
export const mountWithContext = (children: React.ReactNode, context?: object) => {
  return mount(
    <I18nProvider>
      <KibanaContext.Provider value={{ ...mockKibanaContext, ...context }}>
        <LicenseContext.Provider value={{ ...mockLicenseContext, ...context }}>
          {children}
        </LicenseContext.Provider>
      </KibanaContext.Provider>
    </I18nProvider>
  );
};

/**
 * This helper mounts a component with just the default KibanaContext -
 * useful for isolated / helper components that only need this context
 *
 * Same usage/override functionality as mountWithContext
 */
export const mountWithKibanaContext = (children: React.ReactNode, context?: object) => {
  return mount(
    <KibanaContext.Provider value={{ ...mockKibanaContext, ...context }}>
      {children}
    </KibanaContext.Provider>
  );
};

/**
 * This helper is intended for components that have async effects
 * (e.g. http fetches) on mount. It mostly adds act/update boilerplate
 * that's needed for the wrapper to play nice with Enzyme/Jest
 *
 * Example usage:
 *
 * const wrapper = mountWithAsyncContext(<Component />, { http: { get: () => someData } });
 */
export const mountWithAsyncContext = async (
  children: React.ReactNode,
  context: object
): Promise<ReactWrapper> => {
  let wrapper: ReactWrapper | undefined;

  // We get a lot of act() warning/errors in the terminal without this.
  // TBH, I don't fully understand why since Enzyme's mount is supposed to
  // have act() baked in - could be because of the wrapping context provider?
  await act(async () => {
    wrapper = mountWithContext(children, context);
  });
  if (wrapper) {
    wrapper.update(); // This seems to be required for the DOM to actually update

    return wrapper;
  } else {
    throw new Error('Could not mount wrapper');
  }
};
