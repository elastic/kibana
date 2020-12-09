/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import { mount } from 'enzyme';
import React from 'react';
import '../../../common/mock/match_media';
import { AllCasesModal } from './all_cases_modal';
import { TestProviders } from '../../../common/mock';

jest.mock('../all_cases', () => {
  return {
    AllCases: ({ onRowClick }: { onRowClick: ({ id }: { id: string }) => void }) => {
      return (
        <button
          type="button"
          data-test-subj="all-cases-row"
          onClick={() => onRowClick({ id: 'case-id' })}
        >
          {'case-row'}
        </button>
      );
    },
  };
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
  isModalOpen: true,
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

  it('it does not render the modal isModalOpen=false ', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} isModalOpen={false} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeFalsy();
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

  it('onRowClick called when row is clicked', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj='all-cases-row']`).first().simulate('click');
    expect(onRowClick).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
