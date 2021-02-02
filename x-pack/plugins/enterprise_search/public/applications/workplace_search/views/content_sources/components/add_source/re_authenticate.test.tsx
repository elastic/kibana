/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { ReAuthenticate } from './re_authenticate';

describe('ReAuthenticate', () => {
  // Needed to mock redirect window.location.replace(oauthUrl)
  const mockReplace = jest.fn();
  const mockWindow = {
    value: {
      replace: mockReplace,
    },
    writable: true,
  };
  Object.defineProperty(window, 'location', mockWindow);

  const getSourceReConnectData = jest.fn();

  const values = {
    sourceConnectData: { oauthUrl: 'http://oau.th' },
  };

  const props = {
    header: <h1>Header</h1>,
    name: 'Name',
  };

  beforeEach(() => {
    setMockValues({ ...values });
    setMockActions({
      getSourceReConnectData,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ReAuthenticate {...props} />);

    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('handles form submission', () => {
    jest.spyOn(window.location, 'replace').mockImplementationOnce(mockReplace);
    const wrapper = shallow(<ReAuthenticate {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(values.sourceConnectData.oauthUrl);
  });
});
