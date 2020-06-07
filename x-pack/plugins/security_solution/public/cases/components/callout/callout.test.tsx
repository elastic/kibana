/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CallOut } from './callout';
import { ErrorMessage } from './types';

describe('Callout', () => {
  const defaultProps = {
    id: 'md5-hex',
    type: 'primary' as NonNullable<ErrorMessage['errorType']>,
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

  it('transform the button color correctly', () => {
    let wrapper = mount(<CallOut {...defaultProps} />);
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('color')).toBe(
      'primary'
    );

    wrapper = mount(<CallOut {...defaultProps} type={'success'} />);
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('color')).toBe(
      'secondary'
    );

    wrapper = mount(<CallOut {...defaultProps} type={'danger'} />);
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).first().prop('color')).toBe(
      'danger'
    );
  });

  it('dismiss the button correctly', () => {
    const wrapper = mount(<CallOut {...defaultProps} messages={[]} />);
    expect(wrapper.find(`[data-test-subj="callout-dismiss-md5-hex"]`).exists()).toBeTruthy();
    wrapper.find(`button[data-test-subj="callout-dismiss-md5-hex"]`).simulate('click');
    wrapper.update();
    expect(defaultProps.handleDismissCallout).toHaveBeenCalledWith('md5-hex');
  });
});
