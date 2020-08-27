/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';
import '../__mocks__/kea.mock';

import React, { useContext } from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { SetupGuide } from './views/setup_guide';
import { ErrorState } from './views/error_state';
import { Overview } from './views/overview';

import { WorkplaceSearch, WorkplaceSearchUnconfigured, WorkplaceSearchConfigured } from './';

describe('WorkplaceSearch', () => {
  it('renders WorkplaceSearchUnconfigured when config.host is not set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(WorkplaceSearchUnconfigured)).toHaveLength(1);
  });

  it('renders WorkplaceSearchConfigured when config.host set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'some.url' } }));
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(WorkplaceSearchConfigured)).toHaveLength(1);
  });
});

describe('WorkplaceSearchUnconfigured', () => {
  it('renders the Setup Guide and redirects to the Setup Guide', () => {
    const wrapper = shallow(<WorkplaceSearchUnconfigured />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(Redirect)).toHaveLength(1);
  });
});

describe('WorkplaceSearchConfigured', () => {
  beforeEach(() => {
    // Mock resets
    (useValues as jest.Mock).mockImplementation(() => ({}));
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData: () => {} }));
  });

  it('renders with layout', () => {
    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(Overview)).toHaveLength(1);
  });

  it('initializes app data with passed props', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));

    shallow(<WorkplaceSearchConfigured readOnlyMode={true} />);

    expect(initializeAppData).toHaveBeenCalledWith({ readOnlyMode: true });
  });

  it('does not re-initialize app data', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));
    (useValues as jest.Mock).mockImplementation(() => ({ hasInitialized: true }));

    shallow(<WorkplaceSearchConfigured />);

    expect(initializeAppData).not.toHaveBeenCalled();
  });

  it('renders ErrorState', () => {
    (useValues as jest.Mock).mockImplementation(() => ({ errorConnecting: true }));

    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(ErrorState)).toHaveLength(2);
  });
});
