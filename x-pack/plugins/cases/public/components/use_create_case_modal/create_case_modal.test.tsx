/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CreateCaseModal } from './create_case_modal';
import { TestProviders } from '../../common/mock';
import { getCreateCaseLazy as getCreateCase } from '../../methods';

jest.mock('../../methods');
const getCreateCaseMock = getCreateCase as jest.Mock;
const onCloseCaseModal = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  isModalOpen: true,
  onCloseCaseModal,
  onSuccess,
};

describe('CreateCaseModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getCreateCaseMock.mockReturnValue(<></>);
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-modal']`).exists()).toBeTruthy();
  });

  it('it does not render the modal isModalOpen=false ', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} isModalOpen={false} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-modal']`).exists()).toBeFalsy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('.euiModal__closeIcon').first().simulate('click');
    expect(onCloseCaseModal).toBeCalled();
  });

  it('pass the correct props to getCreateCase method', () => {
    mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    expect(getCreateCaseMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        onSuccess,
        onCancel: onCloseCaseModal,
      })
    );
  });
});
