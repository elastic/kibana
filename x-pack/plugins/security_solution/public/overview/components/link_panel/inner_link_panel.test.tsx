/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TestProviders } from '../../../common/mock';
import { InnerLinkPanel } from './inner_link_panel';

describe('InnerLinkPanel', () => {
  const defaultProps = {
    title: 'test_title',
    body: 'test_body',
    button: <div className={'test-button'} />,
    dataTestSubj: 'test-subj',
  };

  it('renders expected children', () => {
    const wrapper = mount(
      <TestProviders>
        <InnerLinkPanel color="warning" {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.exists('[data-test-subj="test-subj"]')).toEqual(true);
    expect(wrapper.exists('.test-button')).toEqual(true);
    expect(wrapper.find('[data-test-subj="inner-link-panel-title"]').hostNodes().text()).toEqual(
      defaultProps.title
    );
  });
});
