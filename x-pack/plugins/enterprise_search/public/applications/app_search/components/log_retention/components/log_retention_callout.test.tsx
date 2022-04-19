/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { LogRetentionOptions } from '..';
import { mountWithIntl } from '../../../../test_helpers';

import { LogRetentionCallout } from '.';

describe('LogRetentionCallout', () => {
  const actions = { fetchLogRetention: jest.fn() };
  const values = { myRole: { canManageLogSettings: true } };
  const DISABLED = {
    disabledAt: '01 Jan 1970 12:00:00 +0000',
    enabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders an analytics callout', () => {
    setMockValues({ ...values, logRetention: { analytics: DISABLED } });
    const wrapper = mountWithIntl(<LogRetentionCallout type={LogRetentionOptions.Analytics} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find('.euiCallOutHeader__title').text()).toEqual(
      'Analytics have been disabled since January 1, 1970.'
    );
    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find('p').text()).toEqual('To manage analytics & logging, visit your settings.');
  });

  it('renders an API callout', () => {
    setMockValues({ ...values, logRetention: { api: DISABLED } });
    const wrapper = mountWithIntl(<LogRetentionCallout type={LogRetentionOptions.API} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find('.euiCallOutHeader__title').text()).toEqual(
      'API Logs have been disabled since January 1, 1970.'
    );
    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find('p').text()).toEqual('To manage analytics & logging, visit your settings.');
  });

  it('renders a generic title if no disabled date is present', () => {
    setMockValues({ ...values, logRetention: { api: { enabled: false, disabledAt: null } } });
    const wrapper = mountWithIntl(<LogRetentionCallout type={LogRetentionOptions.API} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find('.euiCallOutHeader__title').text()).toEqual('API Logs have been disabled.');
  });

  it('does not render if log retention is enabled', () => {
    setMockValues({ ...values, logRetention: { api: { enabled: true } } });
    const wrapper = shallow(<LogRetentionCallout type={LogRetentionOptions.API} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('does not render if log retention is not available', () => {
    setMockValues({ ...values, logRetention: null });
    const wrapper = shallow(<LogRetentionCallout type={LogRetentionOptions.API} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('on mount', () => {
    it('fetches log retention data when not already loaded', () => {
      setMockValues({ ...values, logRetention: null });
      shallow(<LogRetentionCallout type={LogRetentionOptions.API} />);

      expect(actions.fetchLogRetention).toHaveBeenCalled();
    });

    it('does not fetch log retention data if it has already been loaded', () => {
      setMockValues({ ...values, logRetention: {} });
      shallow(<LogRetentionCallout type={LogRetentionOptions.API} />);

      expect(actions.fetchLogRetention).not.toHaveBeenCalled();
    });

    it('does not fetch log retention data if the user does not have access to log settings', () => {
      setMockValues({ ...values, logRetention: null, myRole: { canManageLogSettings: false } });
      shallow(<LogRetentionCallout type={LogRetentionOptions.API} />);

      expect(actions.fetchLogRetention).not.toHaveBeenCalled();
    });
  });
});
