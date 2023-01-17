/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { act } from 'react-dom/test-utils';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiPopover,
  EuiSelectable,
  EuiSelectableList,
  EuiSelectableSearch,
  EuiSwitch,
} from '@elastic/eui';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { rerender } from '../../../../../../test_helpers';

import { DeduplicationPanel } from './deduplication_panel';

const MOCK_ACTIONS = {
  submitDeduplicationUpdate: jest.fn(),
};

const MOCK_VALUES = {
  domain: {
    availableDeduplicationFields: ['title', 'description'],
    deduplicationEnabled: true,
    deduplicationFields: ['title'],
  },
};

describe('DeduplicationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);
  });

  it('renders an empty component if no domain', () => {
    setMockValues({
      ...MOCK_VALUES,
      domain: null,
    });
    const wrapper = shallow(<DeduplicationPanel />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('contains a button to reset to defaults', () => {
    const wrapper = shallow(<DeduplicationPanel />);

    wrapper.find('EuiFlexGroup').first().dive().find(EuiButton).simulate('click');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenCalledWith({
      fields: [],
    });
  });

  it('contains a switch to enable and disable deduplication', () => {
    setMockValues({
      ...MOCK_VALUES,
      domain: {
        ...MOCK_VALUES.domain,
        deduplicationEnabled: false,
      },
    });
    const wrapper = shallow(<DeduplicationPanel />);

    wrapper.find(EuiSwitch).simulate('change');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenNthCalledWith(1, {
      enabled: true,
    });

    setMockValues({
      ...MOCK_VALUES,
      domain: {
        ...MOCK_VALUES.domain,
        deduplicationEnabled: true,
      },
    });
    rerender(wrapper);

    wrapper.find(EuiSwitch).simulate('change');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenNthCalledWith(2, {
      enabled: false,
      fields: [],
    });
  });

  it('contains a popover to switch between displaying all fields or only selected ones', () => {
    const fullRender = mountWithIntl(<DeduplicationPanel />);

    expect(fullRender.find(EuiButtonEmpty).text()).toEqual('All fields');
    expect(fullRender.find(EuiPopover).prop('isOpen')).toEqual(false);

    // Open the popover
    fullRender.find(EuiButtonEmpty).simulate('click');
    rerender(fullRender);

    expect(fullRender.find(EuiPopover).prop('isOpen')).toEqual(true);

    // Click "Show selected fields"
    fullRender.find(EuiContextMenuItem).at(1).simulate('click');
    rerender(fullRender);

    expect(fullRender.find(EuiButtonEmpty).text()).toEqual('Selected fields');
    expect(fullRender.find(EuiPopover).prop('isOpen')).toEqual(false);

    // Open the popover and click "show all fields"
    fullRender.find(EuiButtonEmpty).simulate('click');
    fullRender.find(EuiContextMenuItem).at(0).simulate('click');
    rerender(fullRender);

    expect(fullRender.find(EuiButtonEmpty).text()).toEqual('All fields');
    expect(fullRender.find(EuiPopover).prop('isOpen')).toEqual(false);

    // Open the popover then simulate closing the popover
    fullRender.find(EuiButtonEmpty).simulate('click');
    act(() => {
      fullRender.find(EuiPopover).prop('closePopover')();
    });
    rerender(fullRender);

    expect(fullRender.find(EuiPopover).prop('isOpen')).toEqual(false);
  });

  it('contains a selectable to toggle fields for deduplication', () => {
    const wrapper = shallow(<DeduplicationPanel />);

    wrapper
      .find(EuiSelectable)
      .simulate('change', [{ label: 'title' }, { label: 'description', checked: 'on' }]);

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenCalledWith({
      fields: ['description'],
    });

    const fullRender = mountWithIntl(<DeduplicationPanel />);

    expect(fullRender.find(EuiSelectableSearch)).toHaveLength(1);
    expect(fullRender.find(EuiSelectableList)).toHaveLength(1);
  });
});
