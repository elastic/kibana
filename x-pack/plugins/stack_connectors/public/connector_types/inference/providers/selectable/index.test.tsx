/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableProps } from '@elastic/eui';
import React from 'react';
import type { ShallowWrapper } from 'enzyme';
import { shallow, mount } from 'enzyme';

import { SelectableProvider } from '.';

const mockGetProviders = jest.fn();
describe('SelectableProvider', () => {
  const props = {
    taskType: 'completion',
    getSelectableOptions: jest.fn().mockReturnValue([]),
    onClosePopover: jest.fn(),
    onProviderChange: jest.fn(),
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
        expect(searchProps?.placeholder).toEqual('');
      });
    });

    describe('template', () => {
      beforeAll(() => {
        wrapper = shallow(<SelectableProvider {...templateProps} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', () => {
        const searchProps: EuiSelectableProps['searchProps'] = wrapper
          .find('[data-test-subj="selectable-provider-input"]')
          .prop('searchProps');
        expect(searchProps?.placeholder).toEqual('e.g. template name or description');
      });
    });
  });

  describe('getProviders', () => {
    const args = {
      pageInfo: {
        pageIndex: 1,
      },
      search: '',
    };
    beforeAll(() => {
      mount(<SelectableProvider {...props} />);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('should be called with correct args', () => {
      expect(mockGetProviders).toBeCalledWith(args);
    });
  });
});
