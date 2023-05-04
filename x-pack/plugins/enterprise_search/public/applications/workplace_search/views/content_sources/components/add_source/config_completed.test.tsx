/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { ConfigCompleted } from './config_completed';

describe('ConfigCompleted', () => {
  const advanceStep = jest.fn();
  const props = {
    header: <h1>Header</h1>,
    name: 'foo',
    accountContextOnly: false,
    privateSourcesEnabled: true,
    advanceStep,
  };

  it('renders org context', () => {
    const wrapper = shallow(<ConfigCompleted {...props} />);

    expect(wrapper.find('[data-test-subj="OrgCanConnectMessage"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="PersonalConnectLinkMessage"]')).toHaveLength(0);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });

  it('renders account context', () => {
    const wrapper = shallow(<ConfigCompleted {...props} accountContextOnly />);

    expect(wrapper.find('[data-test-subj="ConfigCompletedPrivateSourcesDocsLink"]')).toHaveLength(
      1
    );
    expect(wrapper.find('[data-test-subj="OrgCanConnectMessage"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="PersonalConnectLinkMessage"]')).toHaveLength(1);
  });

  it('renders private sources disabled message', () => {
    const wrapper = shallow(
      <ConfigCompleted {...props} accountContextOnly privateSourcesEnabled={false} />
    );

    expect(wrapper.find('[data-test-subj="PrivateDisabledMessage"]')).toHaveLength(1);
  });
  it('renders feedback callout when set', () => {
    const wrapper = shallow(<ConfigCompleted {...{ ...props, showFeedbackLink: true }} />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
