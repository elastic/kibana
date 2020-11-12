/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { Switch, Redirect, useParams } from 'react-router-dom';

jest.mock('../../../shared/flash_messages', () => ({
  setQueuedErrorMessage: jest.fn(),
}));
import { setQueuedErrorMessage } from '../../../shared/flash_messages';

import { Loading } from '../loading';

import { EngineRouter } from './';

describe('EngineRouter', () => {
  const values = { dataLoading: false, engineNotFound: false, myRole: {} };
  const actions = { setEngineName: jest.fn(), initializeEngine: jest.fn(), clearEngine: jest.fn() };

  beforeEach(() => {
    setMockValues(values);
    setMockActions(actions);
  });

  describe('useEffect', () => {
    beforeEach(() => {
      (useParams as jest.Mock).mockReturnValue({ engineName: 'some-engine' });
      shallow(<EngineRouter />);
    });

    it('sets engineName based on the current route parameters', () => {
      expect(actions.setEngineName).toHaveBeenCalledWith('some-engine');
    });

    it('initializes/fetches engine API data', () => {
      expect(actions.initializeEngine).toHaveBeenCalled();
    });

    it('clears engine on unmount', () => {
      unmountHandler();
      expect(actions.clearEngine).toHaveBeenCalled();
    });
  });

  it('redirects to engines list and flashes an error if the engine param was not found', () => {
    (useParams as jest.Mock).mockReturnValue({ engineName: '404-engine' });
    setMockValues({ ...values, engineNotFound: true });
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

  it('renders a default engine overview', () => {
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="EngineOverviewTODO"]')).toHaveLength(1);
  });

  it('renders an analytics view', () => {
    setMockValues({ myRole: { canViewEngineAnalytics: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find('[data-test-subj="AnalyticsTODO"]')).toHaveLength(1);
  });
});
