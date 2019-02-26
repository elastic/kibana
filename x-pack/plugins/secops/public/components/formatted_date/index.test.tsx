/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { KibanaConfigContext, PreferenceFormattedDate } from '.';
import { AppFrameworkAdapter } from '../../lib/lib';

describe('PreferenceFormattedDate', () => {
  const framework: Partial<AppFrameworkAdapter> = {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'UTC',
  };

  describe('rendering', () => {
    test('it renders the date supplied when no configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={{}}>
          <PreferenceFormattedDate value="2019-02-25T22:27:05.000Z" />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual('2019-02-25T22:27:05.000Z');
    });

    test('it renders the date supplied when no configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={framework}>
          <PreferenceFormattedDate value="2019-02-25T22:27:05.000Z" />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual('Feb 25, 2019 @ 22:27:05.000');
    });
  });
});
