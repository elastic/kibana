/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { IntlProvider } from 'react-intl';

const intlProvider = new IntlProvider({ locale: 'en', messages: {} }, {});
const { intl } = intlProvider.getChildContext();

/**
 * This helper shallow wraps a component with react-intl's <I18nProvider> which
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
