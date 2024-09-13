/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { fireEvent, render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { AutoRefreshButton } from './auto_refresh_button';

describe('AutoRefreshButton', () => {
  const reFetchRulesMock = jest.fn();
  const setIsRefreshOnMock = jest.fn();

  afterEach(() => {
    reFetchRulesMock.mockReset();
    setIsRefreshOnMock.mockReset();
  });

  it('renders AutoRefreshButton as enabled', () => {
    const wrapper = mount(
      <TestProviders>
        <AutoRefreshButton
          isDisabled={false}
          isRefreshOn={true}
          reFetchRules={reFetchRulesMock}
          setIsRefreshOn={setIsRefreshOnMock}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="autoRefreshButton"]').at(0).text()).toEqual('On');
  });

  it.skip('invokes refetch when enabling auto refresh', () => {
    const { container } = render(
      <AutoRefreshButton
        isDisabled={false}
        isRefreshOn={false}
        reFetchRules={reFetchRulesMock}
        setIsRefreshOn={setIsRefreshOnMock}
      />
    );

    fireEvent(
      container.querySelector('[data-test-subj="autoRefreshButton"]')!,
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );

    fireEvent(
      container.querySelector('[data-test-subj="refreshSettingsSwitch"]')!,
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );

    expect(setIsRefreshOnMock).toHaveBeenCalledTimes(1);
  });
});
