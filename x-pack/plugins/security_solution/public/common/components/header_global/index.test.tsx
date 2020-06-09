/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { HeaderGlobal } from './index';
import { useWithSource } from '../../containers/source';

jest.mock('../../containers/source');
jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/app/siem#/hosts/allHosts',
    hash: '',
    search: '',
    state: '',
  }),
  withRouter: () => jest.fn(),
  generatePath: jest.fn(),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar
jest.mock('../search_bar', () => ({
  SiemSearchBar: () => null,
}));

describe('HeaderGlobal', () => {
  beforeAll(() => {
    (useWithSource as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
    });
  });

  test('it renders', () => {
    const wrapper = shallow(<HeaderGlobal />);

    expect(wrapper).toMatchSnapshot();
  });
});
