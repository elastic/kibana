/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableProps } from '@elastic/eui';
import React from 'react';
import type { ShallowWrapper } from 'enzyme';
import { shallow } from 'enzyme';

import { SelectableProvider } from '.';

describe('SelectableProvider', () => {
  const props = {
    isLoading: false,
    onClosePopover: jest.fn(),
    onProviderChange: jest.fn(),
    getSelectableOptions: jest.fn().mockReturnValue([]),
  };

  describe('should render', () => {
    let wrapper: ShallowWrapper;

    describe('provider', () => {
      beforeAll(() => {
        wrapper = shallow(<SelectableProvider {...props} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', () => {
        const searchProps: EuiSelectableProps['searchProps'] = wrapper
          .find('[data-test-subj="selectable-provider-input"]')
          .prop('searchProps');
        expect(searchProps?.placeholder).toEqual('Search');
      });
    });

    describe('template', () => {
      beforeAll(() => {
        wrapper = shallow(<SelectableProvider {...props} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', () => {
        const searchProps: EuiSelectableProps['searchProps'] = wrapper
          .find('[data-test-subj="selectable-provider-input"]')
          .prop('searchProps');
        expect(searchProps?.placeholder).toEqual('Search');
      });
    });
  });
});
