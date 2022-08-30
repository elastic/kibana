/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiTitle } from '@elastic/eui';

import { ConfigurationIntro } from './configuration_intro';

describe('ConfigurationIntro', () => {
  const props = {
    header: <h1>Header</h1>,
    name: 'foo',
    advanceStepTo: '',
  };

  it('renderscontext', () => {
    const wrapper = shallow(<ConfigurationIntro {...props} />);

    expect(wrapper.find('[data-test-subj="ConfigureStepButton"]')).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(3);
    expect(wrapper.find(EuiTitle)).toHaveLength(3);
  });
});
