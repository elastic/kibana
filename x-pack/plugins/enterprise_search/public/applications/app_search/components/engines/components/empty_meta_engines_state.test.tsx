/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';

import { EmptyMetaEnginesState } from '.';

describe('EmptyMetaEnginesState', () => {
  it('renders', () => {
    const wrapper = shallow(<EmptyMetaEnginesState />)
      .find(EuiEmptyPrompt)
      .dive();

    expect(wrapper.find('h3').text()).toEqual('Create your first meta engine');
    expect(wrapper.find(EuiButton).prop('href')).toEqual(
      expect.stringContaining(docLinks.appSearchMetaEngines)
    );
  });
});
