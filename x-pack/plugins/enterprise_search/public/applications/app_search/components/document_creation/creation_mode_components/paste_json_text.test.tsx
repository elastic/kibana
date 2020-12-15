/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiTextArea } from '@elastic/eui';

import { PasteJsonText } from './';

describe('PasteJsonText', () => {
  const values = {
    textInput: 'hello world',
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setTextInput: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<PasteJsonText />);

    expect(wrapper.find('h3').text()).toEqual('Create documents');
    expect(wrapper.find(EuiTextArea)).toHaveLength(1);
  });

  it('renders and updates the textarea value', () => {
    setMockValues({ ...values, textInput: 'lorem ipsum' });
    const wrapper = shallow(<PasteJsonText />);
    const textarea = wrapper.find(EuiTextArea);

    expect(textarea.prop('value')).toEqual('lorem ipsum');

    textarea.simulate('change', { target: { value: 'dolor sit amet' } });
    expect(actions.setTextInput).toHaveBeenCalledWith('dolor sit amet');
  });
});
