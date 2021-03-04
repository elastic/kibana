/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { EqlQueryBarFooter } from './footer';
import { Cancelable } from 'lodash';

jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, useState: jest.fn() };
});

type DebounceFunc = (...args: unknown[]) => unknown;

jest.mock('lodash', () => {
  const r = jest.requireActual('lodash');
  return {
    ...r,
    debounce: jest.fn().mockImplementation((callback, timeout) => {
      let timeoutId: NodeJS.Timeout;
      const debounced = (jest.fn((...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), timeout);
      }) as unknown) as DebounceFunc & Cancelable;

      const cancel = jest.fn(() => clearTimeout(timeoutId));

      debounced.cancel = cancel;
      return debounced;
    }),
  };
});

const useStateMock = useState as jest.Mock;

describe('EQL footer', () => {
  const setState = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    useStateMock.mockImplementation((init) => [init, setState]);
  });

  describe('EQL Settings', () => {
    it('only call setIsOpenEqlSettings once even if you click multiple times', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlQueryBarFooter errors={[]} onOptionsChange={jest.fn()} />
        </TestProviders>
      );
      const eqlSettingsButton = wrapper.find(`[data-test-subj="eql-settings-trigger"]`).first();

      eqlSettingsButton.simulate('click');
      jest.advanceTimersByTime(100);
      eqlSettingsButton.simulate('click');
      jest.advanceTimersByTime(100);
      eqlSettingsButton.simulate('click');
      jest.runOnlyPendingTimers();

      expect(setState).toBeCalledTimes(1);
    });
  });
});
