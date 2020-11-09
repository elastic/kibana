/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import React from 'react';
import '../../../common/mock/match_media';
import { AllCasesModal } from './all_cases_modal';
import { TestProviders } from '../../../common/mock';

jest.mock('../all_cases', () => {
  const AllCases = () => {
    return <></>;
  };
  return { AllCases };
});

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const onCloseCaseModal = jest.fn();
const onRowClick = jest.fn();
const defaultProps = {
  onCloseCaseModal,
  onRowClick,
};

describe('AllCasesModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeTruthy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('.euiModal__closeIcon').first().simulate('click');
    expect(onCloseCaseModal).toBeCalled();
  });

  it('pass the correct props to AllCases component', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );

    const props = wrapper.find('AllCases').props();
    expect(props).toEqual({
      userCanCrud: false,
      onRowClick,
      isModal: true,
    });
  });
});
