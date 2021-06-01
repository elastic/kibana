/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../__mocks__/react_router';
import '../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions, mockKibanaValues } from '../__mocks__/kea_logic';

import React from 'react';
import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Layout } from '../shared/layout';

import { WorkplaceSearchHeaderActions } from './components/layout';
import { SourceAdded } from './views/content_sources/components/source_added';
import { ErrorState } from './views/error_state';
import { Overview } from './views/overview';
import { SetupGuide } from './views/setup_guide';

import { WorkplaceSearch, WorkplaceSearchUnconfigured, WorkplaceSearchConfigured } from './';

describe('WorkplaceSearch', () => {
  it('renders WorkplaceSearchUnconfigured when config.host is not set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(WorkplaceSearchUnconfigured)).toHaveLength(1);
  });

  it('renders WorkplaceSearchConfigured when config.host set', () => {
    setMockValues({ config: { host: 'some.url' } });
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
  const initializeAppData = jest.fn();
  const setContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions({ initializeAppData, setContext });
  });

  it('renders layout, chrome, and header actions', () => {
    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(Layout).first().prop('readOnlyMode')).toBeFalsy();
    expect(wrapper.find(Overview)).toHaveLength(1);

    expect(mockKibanaValues.setChromeIsVisible).toHaveBeenCalledWith(true);
    expect(mockKibanaValues.renderHeaderActions).toHaveBeenCalledWith(WorkplaceSearchHeaderActions);
  });

  it('initializes app data with passed props', () => {
    shallow(<WorkplaceSearchConfigured isFederatedAuth />);

    expect(initializeAppData).toHaveBeenCalledWith({ isFederatedAuth: true });
  });

  it('does not re-initialize app data or re-render header actions', () => {
    setMockValues({ hasInitialized: true });

    shallow(<WorkplaceSearchConfigured />);

    expect(initializeAppData).not.toHaveBeenCalled();
    expect(mockKibanaValues.renderHeaderActions).not.toHaveBeenCalled();
  });

  it('renders ErrorState', () => {
    setMockValues({ errorConnecting: true });

    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(ErrorState)).toHaveLength(2);
  });

  it('passes readOnlyMode state', () => {
    setMockValues({ readOnlyMode: true });

    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(Layout).first().prop('readOnlyMode')).toEqual(true);
  });

  it('renders SourceAdded', () => {
    const wrapper = shallow(<WorkplaceSearchConfigured />);

    expect(wrapper.find(SourceAdded)).toHaveLength(1);
  });
});
