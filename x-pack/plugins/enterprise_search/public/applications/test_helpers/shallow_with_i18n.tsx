/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, mount, ReactWrapper } from 'enzyme';

import { I18nProvider, __IntlProvider } from '@kbn/i18n-react';

// Use fake component to extract `intl` property to use in tests.
const { intl } = (
  mount(
    <I18nProvider>
      <br />
    </I18nProvider>
  ).find('IntlProvider') as ReactWrapper<{}, {}, __IntlProvider>
)
  .instance()
  .getChildContext();

/**
 * This helper shallow wraps a component with @kbn/i18n's <I18nProvider> which
 * fixes "Could not find required `intl` object" console errors when running tests
 *
 * Example usage (should be the same as shallow()):
 *
 * const wrapper = shallowWithIntl(<Component />);
 */
export const shallowWithIntl = (children: React.ReactNode) => {
  const context = { context: { intl } };

  return shallow(<I18nProvider>{children}</I18nProvider>, context)
    .childAt(0)
    .dive(context)
    .shallow();
};
