/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockAction = jest.fn();

let mockSubcription: (state: object) => void;
const mockDriver = {
  state: { searchTerm: 'foo' },
  actions: { setSearchTerm: mockAction },
  subscribeToStateChanges: jest.fn().mockImplementation((fn) => {
    mockSubcription = fn;
  }),
  unsubscribeToStateChanges: jest.fn(),
};

jest.mock('react', () => ({
  ...(jest.requireActual('react') as object),
  useContext: jest.fn(() => ({
    driver: mockDriver,
  })),
}));

import React from 'react';

import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { useSearchContextState, useSearchContextActions } from './hooks';

describe('hooks', () => {
  describe('useSearchContextState', () => {
    const TestComponent = () => {
      const { searchTerm } = useSearchContextState();
      return <div>{searchTerm}</div>;
    };

    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(<TestComponent />);
    });

    it('exposes search state', () => {
      expect(wrapper.text()).toEqual('foo');
    });

    it('subscribes to state changes', () => {
      act(() => {
        mockSubcription({ searchTerm: 'bar' });
      });

      expect(wrapper.text()).toEqual('bar');
    });

    it('unsubscribes to state changes when unmounted', () => {
      wrapper.unmount();

      expect(mockDriver.unsubscribeToStateChanges).toHaveBeenCalled();
    });
  });

  describe('useSearchContextActions', () => {
    it('exposes actions', () => {
      const TestComponent = () => {
        const { setSearchTerm } = useSearchContextActions();
        setSearchTerm('bar');
        return null;
      };

      mount(<TestComponent />);
      expect(mockAction).toHaveBeenCalled();
    });
  });
});
