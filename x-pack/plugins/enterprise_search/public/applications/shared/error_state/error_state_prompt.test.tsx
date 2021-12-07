/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { mountWithIntl } from '../../test_helpers';

import { ErrorStatePrompt } from './';

describe('ErrorState', () => {
  const values = {
    config: {},
    cloud: { isCloudEnabled: true },
  };

  beforeAll(() => {
    setMockValues(values);
  });

  it('renders a cloud specific error on cloud deployments', () => {
    setMockValues({
      ...values,
      cloud: { isCloudEnabled: true },
    });
    const wrapper = mountWithIntl(<ErrorStatePrompt />);

    expect(wrapper.find('[data-test-subj="CloudError"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="SelfManagedError"]').exists()).toBe(false);
  });

  it('renders a different error if not a cloud deployment', () => {
    setMockValues({
      ...values,
      cloud: { isCloudEnabled: false },
    });
    const wrapper = mountWithIntl(<ErrorStatePrompt />);

    expect(wrapper.find('[data-test-subj="CloudError"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="SelfManagedError"]').exists()).toBe(true);
  });

  it('renders an error message', () => {
    const wrapper = mountWithIntl(<ErrorStatePrompt errorConnectingMessage="I am an error" />);
    expect(wrapper.text()).toContain('I am an error');
  });
});
