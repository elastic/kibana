/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */
import React, { ReactNode } from 'react';
import { mount } from 'enzyme';

import '../../../common/mock/match_media';
import { CreateCaseFlyout } from './flyout';
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

const onCloseFlyout = jest.fn();
const onCaseCreated = jest.fn();
const defaultProps = {
  onCloseFlyout,
  onCaseCreated,
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-flyout']`).exists()).toBeTruthy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('.euiFlyout__closeButton').first().simulate('click');
    expect(onCloseFlyout).toBeCalled();
  });

  it('pass the correct props to FormContext component', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    const props = wrapper.find('FormContext').props();
    expect(props).toEqual(
      expect.objectContaining({
        onSuccess: onCaseCreated,
      })
    );
  });

  it('onSuccess called when creating a case', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj='form-context-on-success']`).first().simulate('click');
    expect(onCaseCreated).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
