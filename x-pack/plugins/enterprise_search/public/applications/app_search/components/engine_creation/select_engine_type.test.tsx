/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { SelectEngineType } from './select_engine_type';

describe('SelectEngineType', () => {
  const DEFAULT_VALUES = {
    engineType: 'appSearch',
  };

  const MOCK_ACTIONS = {
    setEngineType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<SelectEngineType />);
    expect(wrapper.find('[data-test-subj="AppSearchEngineSelectable"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="ElasticsearchEngineSelectable"]')).toHaveLength(1);
  });

  it('create App Search managed engine is the default', () => {
    const wrapper = shallow(<SelectEngineType />);
    const appSearchCardSelectable = wrapper
      .find('[data-test-subj="AppSearchEngineSelectable"]')
      .prop('selectable') as any;
    const elasticsearchCardSelectable = wrapper
      .find('[data-test-subj="ElasticsearchEngineSelectable"]')
      .prop('selectable') as any;

    expect(appSearchCardSelectable.isSelected).toBeTruthy();
    expect(elasticsearchCardSelectable.isSelected).toBeFalsy();
  });

  it('create Elasticsearch-index based engine is selected if chosen', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      engineType: 'elasticsearch',
    });

    const wrapper = shallow(<SelectEngineType />);
    const appSearchCardSelectable = wrapper
      .find('[data-test-subj="AppSearchEngineSelectable"]')
      .prop('selectable') as any;
    const elasticsearchCardSelectable = wrapper
      .find('[data-test-subj="ElasticsearchEngineSelectable"]')
      .prop('selectable') as any;

    expect(appSearchCardSelectable.isSelected).toBeFalsy();
    expect(elasticsearchCardSelectable.isSelected).toBeTruthy();
  });

  it('clicking on Elasticsearch-index based engine sets the engineType', () => {
    const wrapper = shallow(<SelectEngineType />);
    const elasticsearchCardSelectable = wrapper
      .find('[data-test-subj="ElasticsearchEngineSelectable"]')
      .prop('selectable') as any;

    // Like .simulate('click'), but get the function from the selectable
    // property and then call it directly
    elasticsearchCardSelectable.onClick();

    expect(MOCK_ACTIONS.setEngineType).toHaveBeenCalledTimes(1);
  });
});
