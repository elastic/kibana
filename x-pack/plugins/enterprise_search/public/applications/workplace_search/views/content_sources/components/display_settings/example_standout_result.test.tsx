/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../../__mocks__';
import { shallow } from 'enzyme';

import React from 'react';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import { CustomSourceIcon } from './custom_source_icon';

import { ExampleStandoutResult } from './example_standout_result';

describe('ExampleStandoutResult', () => {
  beforeEach(() => {
    setMockValues({ ...exampleResult });
  });

  it('renders', () => {
    const wrapper = shallow(<ExampleStandoutResult />);

    expect(wrapper.find('[data-test-subj="ExampleStandoutResult"]')).toHaveLength(1);
  });

  it('sets correct color prop when dark', () => {
    setMockValues({ ...exampleResult, searchResultConfig: { color: '#000', detailFields: [] } });
    const wrapper = shallow(<ExampleStandoutResult />);

    expect(wrapper.find(CustomSourceIcon).prop('color')).toEqual('white');
  });

  it('shows fallback URL label when no override set', () => {
    setMockValues({ ...exampleResult, searchResultConfig: { detailFields: [], color: '#111' } });
    const wrapper = shallow(<ExampleStandoutResult />);

    expect(wrapper.find('[data-test-subj="DefaultDescriptionLabel"]')).toHaveLength(1);
  });
});
