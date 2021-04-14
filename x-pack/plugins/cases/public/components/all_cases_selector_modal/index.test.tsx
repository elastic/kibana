/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { AllCasesSelectorModal } from '.';
import { TestProviders } from '../../common/mock';
import { getAllCasesLazy as getAllCases } from '../../methods';

jest.mock('../../methods');
const getAllCasesMock = getAllCases as jest.Mock;
const onRowClick = jest.fn();
const createCaseNavigation = { href: '', onClick: jest.fn() };
const defaultProps = {
  createCaseNavigation,
  onRowClick,
  userCanCrud: true,
};
const updateCase = jest.fn();

describe('AllCasesSelectorModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getAllCasesMock.mockReturnValue(<></>);
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
      },
      disabledStatuses: [],
      updateCase,
    };
    mount(
      <TestProviders>
        <AllCasesSelectorModal {...fullProps} />
      </TestProviders>
    );

    expect(getAllCasesMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        alertData: fullProps.alertData,
        createCaseNavigation,
        disabledStatuses: fullProps.disabledStatuses,
        isSelector: true,
        userCanCrud: fullProps.userCanCrud,
        updateCase,
      })
    );
  });
});
