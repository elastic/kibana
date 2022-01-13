/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { ColumnHeaderOptions } from '../../../../../../../common/types';
import { defaultHeaders } from '../../../../../../common/mock';
import { HeaderToolTipContent } from '.';

describe('HeaderToolTipContent', () => {
  let header: ColumnHeaderOptions;
  beforeEach(() => {
    header = cloneDeep(defaultHeaders[0]);
  });

  test('it renders the category', () => {
    const wrapper = mount(<HeaderToolTipContent header={header} />);

    expect(wrapper.find('[data-test-subj="category-value"]').first().text()).toEqual(
      header.category
    );
  });

  test('it renders the name of the field', () => {
    const wrapper = mount(<HeaderToolTipContent header={header} />);

    expect(wrapper.find('[data-test-subj="field-value"]').first().text()).toEqual(header.id);
  });

  test('it renders the expected icon for the header type', () => {
    const wrapper = mount(<HeaderToolTipContent header={header} />);

    expect(wrapper.find('[data-test-subj="type-icon"]').first().props().type).toEqual('clock');
  });

  test('it renders the type of the field', () => {
    const wrapper = mount(<HeaderToolTipContent header={header} />);

    expect(wrapper.find('[data-test-subj="type-value"]').first().text()).toEqual(header.type);
  });

  test('it renders the description of the field', () => {
    const wrapper = mount(<HeaderToolTipContent header={header} />);

    expect(wrapper.find('[data-test-subj="description-value"]').first().text()).toEqual(
      header.description
    );
  });

  test('it does NOT render the description column when the field does NOT contain a description', () => {
    const noDescription = {
      ...header,
      description: '',
    };

    const wrapper = mount(<HeaderToolTipContent header={noDescription} />);

    expect(wrapper.find('[data-test-subj="description"]').exists()).toEqual(false);
  });

  test('it renders the expected table content', () => {
    const wrapper = shallow(<HeaderToolTipContent header={header} />);

    expect(wrapper).toMatchSnapshot();
  });
});
