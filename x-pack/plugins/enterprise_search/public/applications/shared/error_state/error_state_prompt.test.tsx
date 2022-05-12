/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/shallow_useeffect.mock';
import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { mountWithIntl } from '../../test_helpers';

import { ErrorStatePrompt } from '.';

describe('ErrorState', () => {
  const values = {
    config: {},
    cloud: { isCloudEnabled: true },
    errorConnectingMessage: '502 Bad Gateway',
  };

  beforeAll(() => {
    setMockValues(values);
  });

  it('renders an error message', () => {
    const wrapper = mountWithIntl(<ErrorStatePrompt />);
    expect(wrapper.text()).toContain('502 Bad Gateway');
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

  describe('chrome visiblity', () => {
    it('sets chrome visibility to true when not on personal dashboard route', () => {
      mockKibanaValues.history.location.pathname = '/overview';
      mountWithIntl(<ErrorStatePrompt />);

      expect(mockKibanaValues.setChromeIsVisible).toHaveBeenCalledWith(true);
    });

    it('sets chrome visibility to false when on personal dashboard route', () => {
      mockKibanaValues.history.location.pathname = '/p/sources';
      mountWithIntl(<ErrorStatePrompt />);

      expect(mockKibanaValues.setChromeIsVisible).toHaveBeenCalledWith(false);
    });
  });
});
