/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions, mockFlashMessageHelpers } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { Redirect, useLocation } from 'react-router-dom';

import { SourceAdded } from './source_added';

describe('SourceAdded', () => {
  const { setErrorMessage } = mockFlashMessageHelpers;
  const setAddedSource = jest.fn();

  beforeEach(() => {
    setMockActions({ setAddedSource });
    setMockValues({ isOrganization: true });
  });

  it('renders', () => {
    const search = '?name=foo&serviceType=custom&indexPermissions=false';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SourceAdded />);

    expect(wrapper.find(Redirect)).toHaveLength(1);
    expect(setAddedSource).toHaveBeenCalled();
  });

  describe('hasError', () => {
    it('passes default error to server', () => {
      const search = '?name=foo&hasError=true&serviceType=custom&indexPermissions=false';
      (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
      shallow(<SourceAdded />);

      expect(setErrorMessage).toHaveBeenCalledWith('foo failed to connect.');
    });

    it('passes custom error to server', () => {
      const search =
        '?name=foo&hasError=true&serviceType=custom&indexPermissions=false&errorMessages[]=custom error';
      (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
      shallow(<SourceAdded />);

      expect(setErrorMessage).toHaveBeenCalledWith('custom error');
    });
  });
});
