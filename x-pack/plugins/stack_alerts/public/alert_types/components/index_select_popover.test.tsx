/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { IndexSelectPopover } from './index_select_popover';
import { EuiComboBox } from '@elastic/eui';

jest.mock('lodash', () => {
  const module = jest.requireActual('lodash');
  return {
    ...module,
    debounce: (fn: () => unknown) => fn,
  };
});

jest.mock('../../../../triggers_actions_ui/public', () => {
  const original = jest.requireActual('../../../../triggers_actions_ui/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
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
  };
});

describe('IndexSelectPopover', () => {
  const onIndexChange = jest.fn();
  const onTimeFieldChange = jest.fn();
  const props = {
    index: [],
    esFields: [],
    timeField: undefined,
    errors: {
      index: [],
      timeField: [],
    },
    onIndexChange,
    onTimeFieldChange,
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

    await act(async () => {
      const event = { target: { value: 'indexPattern1' } };
      indexComboBox.find('input').first().simulate('change', event);
      await nextTick();
      wrapper.update();
    });

    const updatedIndexSearchValue = wrapper.find('[data-test-subj="comboBoxSearchInput"]');
    expect(updatedIndexSearchValue.first().props().value).toEqual('indexPattern1');

    const thresholdComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="thresholdIndexesComboBox"]');
    const thresholdOptions = thresholdComboBox.prop('options');
    expect(thresholdOptions.length > 0).toBeTruthy();

    await act(async () => {
      thresholdComboBox.prop('onChange')!([thresholdOptions[0].options![0]]);
      await nextTick();
      wrapper.update();
    });
    expect(onIndexChange).toHaveBeenCalledWith(
      [thresholdOptions[0].options![0]].map((opt) => opt.value)
    );

    const timeFieldSelect = wrapper.find('select[data-test-subj="thresholdAlertTimeFieldSelect"]');
    await act(async () => {
      timeFieldSelect.simulate('change', { target: { value: '@timestamp' } });
      await nextTick();
      wrapper.update();
    });
    expect(onTimeFieldChange).toHaveBeenCalledWith('@timestamp');
  });

  test('renders index and timeField if defined', async () => {
    const index = 'test-index';
    const timeField = '@timestamp';
    const indexSelectProps = {
      ...props,
      index: [index],
      timeField,
    };
    const wrapper = mountWithIntl(<IndexSelectPopover {...indexSelectProps} />);
    expect(wrapper.find('button[data-test-subj="selectIndexExpression"]').text()).toEqual(
      `index ${index}`
    );

    wrapper.find('[data-test-subj="selectIndexExpression"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      wrapper.find('EuiSelect[data-test-subj="thresholdAlertTimeFieldSelect"]').text()
    ).toEqual(`Select a field${timeField}`);
  });
});
