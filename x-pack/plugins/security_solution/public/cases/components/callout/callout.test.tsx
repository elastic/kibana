/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CallOut, CallOutProps } from './callout';

describe('Callout', () => {
  const defaultProps: CallOutProps = {
    id: 'md5-hex',
    type: 'primary',
    title: 'a tittle',
    messages: [
      {
        id: 'generic-error',
        title: 'message-one',
        description: <p>{'error'}</p>,
      },
    ],
    showCallOut: true,
    handleDismissCallout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('It renders the callout', () => {
    const wrapper = mount(<CallOut {...defaultProps} />);
    expect(wrapper.find(`[data-test-subj="case-callout-md5-hex"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="callout-messages-md5-hex"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).exists()).toBeTruthy();
  });

  it('hides the callout', () => {
    const wrapper = mount(<CallOut {...defaultProps} showCallOut={false} />);
    expect(wrapper.find(`[data-test-subj="case-callout-md5-hex"]`).exists()).toBeFalsy();
  });

  it('does not shows any messages when the list is empty', () => {
    const wrapper = mount(<CallOut {...defaultProps} messages={[]} />);
    expect(wrapper.find(`[data-test-subj="callout-messages-md5-hex"]`).exists()).toBeFalsy();
  });

  it('transform the button color correctly - primary', () => {
    const wrapper = mount(<CallOut {...defaultProps} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--primary')).toBeTruthy();
  });

  it('transform the button color correctly - success', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'success'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--secondary')).toBeTruthy();
  });

  it('transform the button color correctly - warning', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'warning'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--warning')).toBeTruthy();
  });

  it('transform the button color correctly - danger', () => {
    const wrapper = mount(<CallOut {...defaultProps} type={'danger'} />);
    const className =
      wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('className') ??
      '';
    expect(className.includes('euiButton--danger')).toBeTruthy();
  });

  it('dismiss the callout correctly', () => {
    const wrapper = mount(<CallOut {...defaultProps} messages={[]} />);
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).exists()).toBeTruthy();
    wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).simulate('click');
    wrapper.update();

    expect(defaultProps.handleDismissCallout).toHaveBeenCalledWith('md5-hex', 'primary');
  });
});
