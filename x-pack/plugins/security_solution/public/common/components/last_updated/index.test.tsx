/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';

import { LastUpdatedAt } from './';

describe('LastUpdatedAt', () => {
  beforeEach(() => {
    Date.now = jest.fn().mockReturnValue(1603995369774);
  });

  test('it renders correct relative time', () => {
    const wrapper = mount(
      <I18nProvider>
        <LastUpdatedAt updatedAt={1603995240115} />
      </I18nProvider>
    );

    expect(wrapper.text()).toEqual(' Updated 2 minutes ago');
  });

  test('it only renders icon if "compact" is true', () => {
    const wrapper = mount(
      <I18nProvider>
        <LastUpdatedAt compact updatedAt={1603995240115} />
      </I18nProvider>
    );

    expect(wrapper.text()).toEqual('');
    expect(wrapper.find('[data-test-subj="last-updated-at-clock-icon"]').exists()).toBeTruthy();
  });

  test('it renders updating text if "showUpdating" is true', () => {
    const wrapper = mount(
      <I18nProvider>
        <LastUpdatedAt updatedAt={1603995240115} showUpdating />
      </I18nProvider>
    );

    expect(wrapper.text()).toEqual(' Updating...');
  });
});
