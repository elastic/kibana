/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import {
  EuiButton,
  EuiButtonGroup,
  EuiSelectable,
  EuiSelectableList,
  EuiSelectableSearch,
  EuiSwitch,
} from '@elastic/eui';

import { mountWithIntl, rerender } from '../../../../../test_helpers';

import { DeduplicationPanel } from './deduplication_panel';

const MOCK_ACTIONS = {
  submitDeduplicationUpdate: jest.fn(),
};

const MOCK_VALUES = {
  domain: {
    deduplicationEnabled: true,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
  },
};

describe('DeduplicationPanel', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);
    wrapper = shallow(<DeduplicationPanel />);
  });

  it('renders an empty components if no domain', () => {
    setMockValues({
      ...MOCK_VALUES,
      domain: null,
    });
    rerender(wrapper);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
  it('contains a button to reset to defaults', () => {
    wrapper.find(EuiButton).simulate('click');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenCalledWith(MOCK_VALUES.domain, {
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
    rerender(wrapper);

    wrapper.find(EuiSwitch).simulate('change');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenNthCalledWith(
      1,
      {
        ...MOCK_VALUES.domain,
        deduplicationEnabled: false,
      },
      {
        enabled: true,
      }
    );

    setMockValues({
      ...MOCK_VALUES,
      domain: {
        ...MOCK_VALUES.domain,
        deduplicationEnabled: true,
      },
    });
    rerender(wrapper);
    wrapper.find(EuiSwitch).simulate('change');

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenNthCalledWith(
      2,
      {
        ...MOCK_VALUES.domain,
        deduplicationEnabled: true,
      },
      {
        enabled: false,
        fields: [],
      }
    );
  });

  it('contains a button group to switch between displaying all fields or only selected ones', () => {
    // by default it shows all fields
    expect(wrapper.find(EuiSelectable).prop('options')).toHaveLength(2);

    // switch to selected fields
    wrapper.find(EuiButtonGroup).simulate('change');
    rerender(wrapper);

    expect(wrapper.find(EuiSelectable).prop('options')).toHaveLength(1);
  });

  it('contains a selectable to toggle fields for deduplication', () => {
    wrapper
      .find(EuiSelectable)
      .simulate('change', [{ label: 'title' }, { label: 'description', checked: 'on' }]);

    expect(MOCK_ACTIONS.submitDeduplicationUpdate).toHaveBeenCalledWith(MOCK_VALUES.domain, {
      fields: ['description'],
    });

    const fullRender = mountWithIntl(<DeduplicationPanel />);

    expect(fullRender.find(EuiSelectableSearch)).toHaveLength(1);
    expect(fullRender.find(EuiSelectableList)).toHaveLength(1);
  });
});
