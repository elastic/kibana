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
import { EuiFilePicker } from '@elastic/eui';

import { UploadJsonFile } from './';

describe('UploadJsonFile', () => {
  const values = {
    fileInput: [],
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setFileInput: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<UploadJsonFile />);

    expect(wrapper.find('h3').text()).toEqual('Drag and drop .json');
    expect(wrapper.find(EuiFilePicker)).toHaveLength(1);
  });

  it('updates state when files are dropped in', () => {
    const wrapper = shallow(<UploadJsonFile />);

    wrapper.find(EuiFilePicker).simulate('change', ['mock file']);
    expect(actions.setFileInput).toHaveBeenCalledWith(['mock file']);
  });
});
