/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { AllCasesSelectorModal } from '.';
import { TestProviders } from '../../../common/mock';
import { AllCasesList } from '../all_cases_list';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';

jest.mock('../all_cases_list');

const onRowClick = jest.fn();
const defaultProps = {
  onRowClick,
};
const updateCase = jest.fn();

describe('AllCasesSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesSelectorModal {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeTruthy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesSelectorModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('.euiModal__closeIcon').first().simulate('click');
    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeFalsy();
  });

  it('pass the correct props to getAllCases method', () => {
    const fullProps = {
      ...defaultProps,
      alertData: {
        rule: {
          id: 'rule-id',
          name: 'rule',
        },
        index: 'index-id',
        alertId: 'alert-id',
        owner: SECURITY_SOLUTION_OWNER,
      },
      hiddenStatuses: [],
      updateCase,
    };

    mount(
      <TestProviders>
        <AllCasesSelectorModal {...fullProps} />
      </TestProviders>
    );

    // @ts-ignore idk what this mock style is but it works ¯\_(ツ)_/¯
    expect(AllCasesList.type.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        alertData: fullProps.alertData,
        hiddenStatuses: fullProps.hiddenStatuses,
        isSelectorView: true,
        updateCase,
      })
    );
  });
});
