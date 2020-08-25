/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';
import '../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useActions } from 'kea';

import { HttpProvider } from './';

describe('HttpProvider', () => {
  const props = {
    http: {} as any,
    errorConnecting: false,
  };
  const initializeHttp = jest.fn();
  const initializeHttpInterceptors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useActions as jest.Mock).mockImplementationOnce(() => ({
      initializeHttp,
      initializeHttpInterceptors,
    }));
  });

  it('does not render', () => {
    const wrapper = shallow(<HttpProvider {...props} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('calls initialization actions on mount', () => {
    shallow(<HttpProvider {...props} />);

    expect(initializeHttp).toHaveBeenCalledWith(props);
    expect(initializeHttpInterceptors).toHaveBeenCalled();
  });
});
