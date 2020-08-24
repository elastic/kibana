/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kea.mock';

import { useValues } from 'kea';
import React from 'react';
import { shallow } from 'enzyme';
import { EuiCallOut } from '@elastic/eui';

import { FlashMessages } from './';

describe('FlashMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render if no messages exist', () => {
    (useValues as jest.Mock).mockImplementationOnce(() => ({ messages: [] }));

    const wrapper = shallow(<FlashMessages />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders an array of flash messages & types', () => {
    const mockMessages = [
      { type: 'success', message: 'Hello world!!' },
      {
        type: 'error',
        message: 'Whoa nelly!',
        description: <div data-test-subj="error">Something went wrong</div>,
      },
      { type: 'info', message: 'Everything is fine, nothing is ruined' },
      { type: 'warning', message: 'Uh oh' },
      { type: 'info', message: 'Testing multiples of same type' },
    ];
    (useValues as jest.Mock).mockImplementationOnce(() => ({ messages: mockMessages }));

    const wrapper = shallow(<FlashMessages />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(5);
    expect(wrapper.find(EuiCallOut).first().prop('color')).toEqual('success');
    expect(wrapper.find('[data-test-subj="error"]')).toHaveLength(1);
    expect(wrapper.find(EuiCallOut).last().prop('iconType')).toEqual('iInCircle');
  });

  it('renders any children', () => {
    (useValues as jest.Mock).mockImplementationOnce(() => ({ messages: [{ type: 'success' }] }));

    const wrapper = shallow(
      <FlashMessages>
        <button data-test-subj="testing">
          Some action - you could even clear flash messages here
        </button>
      </FlashMessages>
    );

    expect(wrapper.find('[data-test-subj="testing"]').text()).toContain('Some action');
  });
});
