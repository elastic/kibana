/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CallOut, CallOutProps } from './callout';
import { CLOSED_CASE_PUSH_ERROR_ID } from './types';
import { TestProviders } from '../../../common/mock';

describe('Callout', () => {
  const handleButtonClick = jest.fn();
  const defaultProps: CallOutProps = {
    id: 'md5-hex',
    type: 'primary',
    messages: [
      {
        id: 'generic-error',
        title: 'message-one',
        description: <p>{'error'}</p>,
      },
    ],
    handleButtonClick,
    hasLicenseError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('It renders the callout', () => {
    const wrapper = mount(<CallOut {...defaultProps} />);
    expect(wrapper.find(`[data-test-subj="case-callout-md5-hex"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="callout-messages-md5-hex"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="callout-onclick-md5-hex"]`).exists()).toBeTruthy();
  });

  it('does not shows any messages when the list is empty', () => {
    const wrapper = mount(<CallOut {...defaultProps} messages={[]} />);
    expect(wrapper.find(`[data-test-subj="callout-messages-md5-hex"]`).exists()).toBeFalsy();
  });

  it('transform the button color correctly - primary', () => {
    const wrapper = mount(<CallOut {...defaultProps} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--primary')).toBeTruthy();
  });

  it('transform the button color correctly - success', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'success'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--success')).toBeTruthy();
  });

  it('transform the button color correctly - warning', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'warning'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--warning')).toBeTruthy();
  });

  it('transform the button color correctly - danger', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'danger'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--danger')).toBeTruthy();
  });

  it('does not show the button when case is closed error is present', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: CLOSED_CASE_PUSH_ERROR_ID,
          title: 'message-one',
          description: <p>{'error'}</p>,
        },
      ],
    };

    const wrapper = mount(
      <TestProviders>
        <CallOut {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).exists()).toEqual(
      false
    );
  });

  it('does not show the button when license error is present', () => {
    const props = {
      ...defaultProps,
      hasLicenseError: true,
    };

    const wrapper = mount(
      <TestProviders>
        <CallOut {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).exists()).toEqual(
      false
    );
  });

  // use this for storage if we ever want to bring that back
  it('onClick passes id and type', () => {
    const wrapper = mount(<CallOut {...defaultProps} />);
    expect(wrapper.find(`[data-test-subj="callout-onclick-md5-hex"]`).exists()).toBeTruthy();
    wrapper.find(`button[data-test-subj="callout-onclick-md5-hex"]`).simulate('click');
    expect(handleButtonClick.mock.calls[0][1]).toEqual('md5-hex');
    expect(handleButtonClick.mock.calls[0][2]).toEqual('primary');
  });
});
