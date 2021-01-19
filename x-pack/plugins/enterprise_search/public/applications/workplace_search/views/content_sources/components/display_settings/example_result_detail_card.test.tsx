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

import { ExampleResultDetailCard } from './example_result_detail_card';

describe('ExampleResultDetailCard', () => {
  beforeEach(() => {
    setMockValues({ ...exampleResult });
  });

  it('renders', () => {
    const wrapper = shallow(<ExampleResultDetailCard />);

    expect(wrapper.find('[data-test-subj="ExampleResultDetailCard"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="DetailField"]')).toHaveLength(
      exampleResult.searchResultConfig.detailFields.length
    );
  });

  it('shows fallback URL label when no override set', () => {
    setMockValues({ ...exampleResult, searchResultConfig: { detailFields: [] } });
    const wrapper = shallow(<ExampleResultDetailCard />);

    expect(wrapper.find('[data-test-subj="DefaultUrlLabel"]')).toHaveLength(1);
  });
});
