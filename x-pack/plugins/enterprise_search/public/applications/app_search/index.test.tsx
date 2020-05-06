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
import { EngineOverview } from './components/engine_overview';

import { AppSearch } from './';

describe('App Search Routes', () => {
  describe('/app_search', () => {
    it('redirects to Setup Guide when enterpriseSearchUrl is not set', () => {
      useContext.mockImplementationOnce(() => ({ enterpriseSearchUrl: '' }));
      const wrapper = shallow(<AppSearch />);

      expect(wrapper.find(Redirect)).toHaveLength(1);
      expect(wrapper.find(EngineOverview)).toHaveLength(0);
    });

    it('renders Engine Overview when enterpriseSearchUrl is set', () => {
      useContext.mockImplementationOnce(() => ({ enterpriseSearchUrl: 'https://foo.bar' }));
      const wrapper = shallow(<AppSearch />);

      expect(wrapper.find(EngineOverview)).toHaveLength(1);
      expect(wrapper.find(Redirect)).toHaveLength(0);
    });
  });

  describe('/app_search/setup_guide', () => {
    it('renders', () => {
      const wrapper = shallow(<AppSearch />);

      expect(wrapper.find(SetupGuide)).toHaveLength(1);
    });
  });
});
