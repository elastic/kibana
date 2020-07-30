/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';

import React, { useContext } from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';

import { SetupGuide } from './components/setup_guide';
import { Overview } from './components/overview';

import { WorkplaceSearch } from './';

describe('Workplace Search Routes', () => {
  describe('/', () => {
    it('redirects to Setup Guide when enterpriseSearchUrl is not set', () => {
      (useContext as jest.Mock).mockImplementationOnce(() => ({ enterpriseSearchUrl: '' }));
      const wrapper = shallow(<WorkplaceSearch />);

      expect(wrapper.find(Redirect)).toHaveLength(1);
      expect(wrapper.find(Overview)).toHaveLength(0);
    });

    it('renders Engine Overview when enterpriseSearchUrl is set', () => {
      (useContext as jest.Mock).mockImplementationOnce(() => ({
        enterpriseSearchUrl: 'https://foo.bar',
      }));
      const wrapper = shallow(<WorkplaceSearch />);

      expect(wrapper.find(Overview)).toHaveLength(1);
      expect(wrapper.find(Redirect)).toHaveLength(0);
    });
  });

  describe('/setup_guide', () => {
    it('renders', () => {
      const wrapper = shallow(<WorkplaceSearch />);

      expect(wrapper.find(SetupGuide)).toHaveLength(1);
    });
  });
});
