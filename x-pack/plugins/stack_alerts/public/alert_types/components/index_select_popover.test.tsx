/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { IndexSelectPopover } from './index_select_popover';

jest.mock('../../../../triggers_actions_ui/public', () => ({
  getIndexPatterns: () => {
    return ['index1', 'index2'];
  },
  firstFieldOption: () => {
    return { text: 'Select a field', value: '' };
  },
  getTimeFieldOptions: () => {
    return [
      {
        text: '@timestamp',
        value: '@timestamp',
      },
    ];
  },
  getFields: () => {
    return Promise.resolve([
      {
        name: '@timestamp',
        type: 'date',
      },
      {
        name: 'field',
        type: 'text',
      },
    ]);
  },
  getIndexOptions: () => {
    return Promise.resolve([
      {
        label: 'indexOption',
        options: [
          {
            label: 'index1',
            value: 'index1',
          },
          {
            label: 'index2',
            value: 'index2',
          },
        ],
      },
    ]);
  },
}));

describe('IndexSelectPopover', () => {
  const props = {
    index: [],
    esFields: [],
    timeField: undefined,
    errors: {
      index: [],
      timeField: [],
    },
    onIndexChange: jest.fn(),
    onTimeFieldChange: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders closed popover initially and opens on click', async () => {
    const wrapper = mountWithIntl(<IndexSelectPopover {...props} />);

    expect(wrapper.find('[data-test-subj="selectIndexExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdIndexesComboBox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="thresholdAlertTimeFieldSelect"]').exists()).toBeFalsy();

    wrapper.find('[data-test-subj="selectIndexExpression"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="thresholdIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdAlertTimeFieldSelect"]').exists()).toBeTruthy();
  });

  test('renders search input', async () => {
    const wrapper = mountWithIntl(<IndexSelectPopover {...props} />);

    expect(wrapper.find('[data-test-subj="selectIndexExpression"]').exists()).toBeTruthy();
    wrapper.find('[data-test-subj="selectIndexExpression"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="thresholdIndexesComboBox"]').exists()).toBeTruthy();
    const indexSearchBoxValue = wrapper.find('[data-test-subj="comboBoxSearchInput"]');
    expect(indexSearchBoxValue.first().props().value).toEqual('');

    const indexComboBox = wrapper.find('#indexSelectSearchBox');
    indexComboBox.first().simulate('click');
    const event = { target: { value: 'indexPattern1' } };
    indexComboBox.find('input').first().simulate('change', event);

    const updatedIndexSearchValue = wrapper.find('[data-test-subj="comboBoxSearchInput"]');
    expect(updatedIndexSearchValue.first().props().value).toEqual('indexPattern1');
  });
});
