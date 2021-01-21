/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import { mockFlashMessageHelpers, setMockValues, setMockActions } from '../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';
import { Switch, Redirect, useParams } from 'react-router-dom';

import { Loading } from '../../../shared/loading';
import { EngineOverview } from '../engine_overview';
import { AnalyticsRouter } from '../analytics';

import { EngineRouter } from './';

describe('EngineRouter', () => {
  const values = {
    dataLoading: false,
    engineNotFound: false,
    myRole: {},
    engineName: 'some-engine',
  };
  const actions = { setEngineName: jest.fn(), initializeEngine: jest.fn(), clearEngine: jest.fn() };

  beforeEach(() => {
    setMockValues(values);
    setMockActions(actions);
    (useParams as jest.Mock).mockReturnValue({ engineName: 'some-engine' });
  });

  describe('useEffect', () => {
    beforeEach(() => {
      shallow(<EngineRouter />);
    });

    it('sets engineName based on the current route parameters', () => {
      expect(actions.setEngineName).toHaveBeenCalledWith('some-engine');
    });

    it('initializes/fetches engine API data', () => {
      expect(actions.initializeEngine).toHaveBeenCalled();
    });

    it('clears engine on unmount and on update', () => {
      unmountHandler();
      expect(actions.clearEngine).toHaveBeenCalled();
    });
  });

  it('redirects to engines list and flashes an error if the engine param was not found', () => {
    const { setQueuedErrorMessage } = mockFlashMessageHelpers;
    setMockValues({ ...values, engineNotFound: true, engineName: '404-engine' });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Redirect).prop('to')).toEqual('/engines');
    expect(setQueuedErrorMessage).toHaveBeenCalledWith(
      "No engine with name '404-engine' could be found."
    );
  });

  it('renders a loading component if async data is still loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<EngineRouter />);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  // This would happen if a user jumps around from one engine route to another. If the engine name
  // on the path has changed, but we still have an engine stored in state, we do not want to load
  // any route views as they would be rendering with the wrong data.
  it('renders a loading component if the engine stored in state is stale', () => {
    setMockValues({ ...values, engineName: 'some-engine' });
    (useParams as jest.Mock).mockReturnValue({ engineName: 'some-new-engine' });
    const wrapper = shallow(<EngineRouter />);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders a default engine overview', () => {
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(EngineOverview)).toHaveLength(1);
  });

  it('renders an analytics view', () => {
    setMockValues({ ...values, myRole: { canViewEngineAnalytics: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(AnalyticsRouter)).toHaveLength(1);
  });
});
