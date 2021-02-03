/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import React, { ReactNode } from 'react';
import { mount } from 'enzyme';

import '../../../common/mock/match_media';
import { CreateCaseModal } from './create_case_modal';
import { TestProviders } from '../../../common/mock';

jest.mock('../create/form_context', () => {
  return {
    FormContext: ({
      children,
      onSuccess,
    }: {
      children: ReactNode;
      onSuccess: ({ id }: { id: string }) => void;
    }) => {
      return (
        <>
          <button
            type="button"
            data-test-subj="form-context-on-success"
            onClick={() => onSuccess({ id: 'case-id' })}
          >
            {'submit'}
          </button>
          {children}
        </>
      );
    },
  };
});

jest.mock('../create/form', () => {
  return {
    CreateCaseForm: () => {
      return <>{'form'}</>;
    },
  };
});

jest.mock('../create/submit_button', () => {
  return {
    SubmitCaseButton: () => {
      return <>{'Submit'}</>;
    },
  };
});

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
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeTruthy();
  });

  it('it does not render the modal isModalOpen=false ', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} isModalOpen={false} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='all-cases-modal']`).exists()).toBeFalsy();
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

  it('pass the correct props to FormContext component', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    const props = wrapper.find('FormContext').props();
    expect(props).toEqual(
      expect.objectContaining({
        onSuccess,
      })
    );
  });

  it('onSuccess called when creating a case', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseModal {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj='form-context-on-success']`).first().simulate('click');
    expect(onSuccess).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
