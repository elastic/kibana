/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSwitch } from '@elastic/eui';

import { SchemaTypes } from '../../../../../shared/types';

import { TextSearchToggle } from './text_search_toggle';

describe('TextSearchToggle', () => {
  const actions = {
    toggleSearchField: jest.fn(),
  };

  beforeAll(() => {
    setMockActions(actions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('typical render', () => {
    let wrapper: ShallowWrapper;

    const props = {
      name: 'foo',
      type: 'text' as SchemaTypes,
      field: {
        weight: 1,
      },
    };

    beforeAll(() => {
      wrapper = shallow(<TextSearchToggle {...props} />);
    });

    it('renders a toggle button', () => {
      expect(wrapper.find(EuiSwitch).exists()).toBe(true);
    });

    it('shows the toggle button as checked if any value was passed in the "field" prop', () => {
      expect(wrapper.find(EuiSwitch).prop('checked')).toBe(true);
    });

    it('shows the toggle as enabled if "text" was passed in the "type" prop', () => {
      expect(wrapper.find(EuiSwitch).prop('disabled')).toBe(false);
    });

    it('shows a relevant label if "text" was passed in the "type" prop', () => {
      expect(wrapper.find(EuiSwitch).prop('label')).toBe('Search this field');
    });

    it('will update toggled state when clicked', () => {
      wrapper.find(EuiSwitch).simulate('change');
      expect(actions.toggleSearchField).toHaveBeenCalledWith('foo', true);
    });
  });

  describe('when a non-"text" type is passed in the "type" prop', () => {
    let wrapper: ShallowWrapper;

    const props = {
      name: 'foo',
      type: 'number' as SchemaTypes,
      field: {
        weight: 1,
      },
    };

    beforeAll(() => {
      wrapper = shallow(<TextSearchToggle {...props} />);
    });

    it('shows the toggle button as disabled', () => {
      expect(wrapper.find(EuiSwitch).prop('checked')).toBe(true);
    });

    it('shows a relevant label', () => {
      expect(wrapper.find(EuiSwitch).prop('label')).toBe(
        'Search can only be enabled on text fields'
      );
    });

    it('will not update state when the clicked', () => {
      wrapper.find(EuiSwitch).simulate('change');
      expect(actions.toggleSearchField).not.toHaveBeenCalled();
    });
  });

  describe('when no field prop is passed', () => {
    let wrapper: ShallowWrapper;

    const props = {
      name: 'foo',
      type: 'text' as SchemaTypes,
    };

    beforeAll(() => {
      wrapper = shallow(<TextSearchToggle {...props} />);
    });

    it('shows the toggle button as unchecked', () => {
      expect(wrapper.find(EuiSwitch).prop('checked')).toBe(false);
    });

    it('will update toggled state when clicked', () => {
      wrapper.find(EuiSwitch).simulate('change');
      expect(actions.toggleSearchField).toHaveBeenCalledWith('foo', false);
    });
  });
});
