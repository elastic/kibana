/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { LocationDescriptorObject, LocationListener, UnregisterCallback } from 'history';
import * as React from 'react';

import { SiemNavigationComponent } from './';
import { setBreadcrumbs } from './breadcrumbs';

jest.mock('./breadcrumbs', () => ({
  setBreadcrumbs: jest.fn(),
}));
type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
describe('SIEM Navigation', () => {
  const location = {
    pathname: '/hosts',
    search: '',
    state: '',
    hash: '',
  };
  const mockProps = {
    location,
    match: {
      isExact: true,
      params: {},
      path: '',
      url: '',
    },
    history: {
      length: 2,
      location,
      action: pop,
      push: () => null,
      replace: () => null,
      go: () => null,
      goBack: () => null,
      goForward: () => null,
      block: (t: UnregisterCallback) => t,
      createHref: (t: LocationDescriptorObject) => 't',
      listen: (l: LocationListener) => {
        const temp: UnregisterCallback = () => null;
        return temp;
      },
    },
  };
  const wrapper = shallow(<SiemNavigationComponent {...mockProps} />);
  test('it calls setBreadcrumbs with correct path on mount', () => {
    // @ts-ignore property mock does not exists
    expect(setBreadcrumbs.mock.calls[0][0]).toEqual('/hosts');
  });
  test('it calls setBreadcrumbs with correct path on update', () => {
    wrapper.setProps({ location: { pathname: '/network' } });
    wrapper.update();
    // @ts-ignore property mock does not exists
    expect(setBreadcrumbs.mock.calls[1][0]).toEqual('/network');
  });
});
