/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

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
