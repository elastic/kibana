/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSelectable, EuiSelectableList, EuiSelectableSearch } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { SimplifiedSelectable } from './simplified_selectable';

describe('SimplifiedSelectable', () => {
  let wrapper: ShallowWrapper;

  const MOCK_ON_CHANGE = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(
      <SimplifiedSelectable
        options={['cat', 'dog', 'fish']}
        selectedOptions={['cat', 'fish']}
        onChange={MOCK_ON_CHANGE}
        emptyMessage={'empty message'}
      />
    );
  });

  it('combines the options and selected options', () => {
    expect(wrapper.find(EuiSelectable).prop('options')).toEqual([
      {
        label: 'cat',
        checked: 'on',
      },
      {
        label: 'dog',
      },
      {
        label: 'fish',
        checked: 'on',
      },
    ]);
  });

  it('passes on an empty message', () => {
    expect(wrapper.find(EuiSelectable).prop('emptyMessage')).toEqual('empty message');
  });

  it('passes newly selected options to the callback', () => {
    wrapper.find(EuiSelectable).simulate('change', [
      {
        label: 'cat',
        checked: 'on',
      },
      {
        label: 'dog',
      },
      {
        label: 'fish',
        checked: 'on',
      },
    ]);

    expect(MOCK_ON_CHANGE).toHaveBeenCalledWith(['cat', 'fish']);
  });

  describe('select all button', () => {
    it('it is disabled when all options are already selected', () => {
      wrapper = shallow(
        <SimplifiedSelectable
          options={['cat', 'dog', 'fish']}
          selectedOptions={['cat', 'dog', 'fish']}
          onChange={MOCK_ON_CHANGE}
        />
      );

      expect(wrapper.find('[data-test-subj="SelectAllButton"]').prop('disabled')).toEqual(true);
    });

    it('allows the user to select all options', () => {
      wrapper.find('[data-test-subj="SelectAllButton"]').simulate('click');
      expect(MOCK_ON_CHANGE).toHaveBeenLastCalledWith(['cat', 'dog', 'fish']);
    });
  });

  describe('deselect all button', () => {
    it('it is disabled when all no options are selected', () => {
      wrapper = shallow(
        <SimplifiedSelectable
          options={['cat', 'dog', 'fish']}
          selectedOptions={[]}
          onChange={MOCK_ON_CHANGE}
        />
      );

      expect(wrapper.find('[data-test-subj="DeselectAllButton"]').prop('disabled')).toEqual(true);
    });

    it('allows the user to select all options', () => {
      wrapper.find('[data-test-subj="DeselectAllButton"]').simulate('click');
      expect(MOCK_ON_CHANGE).toHaveBeenLastCalledWith([]);
    });
  });

  it('renders a search bar and selectable list', () => {
    const fullRender = mountWithIntl(
      <SimplifiedSelectable
        options={['cat', 'dog', 'fish']}
        selectedOptions={['cat', 'fish']}
        onChange={MOCK_ON_CHANGE}
      />
    );

    expect(fullRender.find(EuiSelectableSearch)).toHaveLength(1);
    expect(fullRender.find(EuiSelectableList)).toHaveLength(1);
  });
});
