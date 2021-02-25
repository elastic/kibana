/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { CurationQuery } from './curation_query';

import { CurationQueries } from './';

describe('CurationQueries', () => {
  const props = {
    queries: ['a', 'b', 'c'],
    onSubmit: jest.fn(),
  };
  const values = {
    queries: ['a', 'b', 'c'],
    hasEmptyQueries: false,
    hasOnlyOneQuery: false,
  };
  const actions = {
    addQuery: jest.fn(),
    editQuery: jest.fn(),
    deleteQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a CurationQuery row for each query', () => {
    const wrapper = shallow(<CurationQueries {...props} />);

    expect(wrapper.find(CurationQuery)).toHaveLength(3);
    expect(wrapper.find(CurationQuery).at(0).prop('queryValue')).toEqual('a');
    expect(wrapper.find(CurationQuery).at(1).prop('queryValue')).toEqual('b');
    expect(wrapper.find(CurationQuery).at(2).prop('queryValue')).toEqual('c');
  });

  it('calls editQuery when the CurationQuery value changes', () => {
    const wrapper = shallow(<CurationQueries {...props} />);
    wrapper.find(CurationQuery).at(0).simulate('change', 'new query value');

    expect(actions.editQuery).toHaveBeenCalledWith(0, 'new query value');
  });

  it('calls deleteQuery when the CurationQuery calls onDelete', () => {
    const wrapper = shallow(<CurationQueries {...props} />);
    wrapper.find(CurationQuery).at(2).simulate('delete');

    expect(actions.deleteQuery).toHaveBeenCalledWith(2);
  });

  it('calls addQuery when the Add Query button is clicked', () => {
    const wrapper = shallow(<CurationQueries {...props} />);
    wrapper.find('[data-test-subj="addCurationQueryButton"]').simulate('click');

    expect(actions.addQuery).toHaveBeenCalled();
  });

  it('disables the add button if any query fields are empty', () => {
    setMockValues({
      ...values,
      queries: ['a', '', 'c'],
      hasEmptyQueries: true,
    });
    const wrapper = shallow(<CurationQueries {...props} />);
    const button = wrapper.find('[data-test-subj="addCurationQueryButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });

  it('calls the passed onSubmit callback when the submit button is clicked', () => {
    setMockValues({ ...values, queries: ['some query'] });
    const wrapper = shallow(<CurationQueries {...props} />);
    wrapper.find('[data-test-subj="submitCurationQueriesButton"]').simulate('click');

    expect(props.onSubmit).toHaveBeenCalledWith(['some query']);
  });

  it('disables the submit button if no query fields have been filled', () => {
    setMockValues({
      ...values,
      queries: [''],
      hasOnlyOneQuery: true,
      hasEmptyQueries: true,
    });
    const wrapper = shallow(<CurationQueries {...props} />);
    const button = wrapper.find('[data-test-subj="submitCurationQueriesButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
