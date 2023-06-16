/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockFlashMessageHelpers,
  setMockValues,
  setMockActions,
} from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import { mockEngineValues } from '../../__mocks__';

import React from 'react';
import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Routes } from '@kbn/shared-ux-router';

import { AnalyticsRouter } from '../analytics';
import { ApiLogs } from '../api_logs';
import { CrawlerRouter } from '../crawler';
import { CurationsRouter } from '../curations';
import { Documents, DocumentDetail } from '../documents';
import { EngineOverview } from '../engine_overview';
import { RelevanceTuning } from '../relevance_tuning';
import { ResultSettings } from '../result_settings';
import { SchemaRouter } from '../schema';
import { SearchUI } from '../search_ui';
import { SourceEngines } from '../source_engines';
import { Synonyms } from '../synonyms';

import { EngineRouter } from './engine_router';

describe('EngineRouter', () => {
  const values = {
    ...mockEngineValues,
    dataLoading: false,
    engineNotFound: false,
    isMetaEngine: false,
    myRole: {},
  };
  const actions = {
    setEngineName: jest.fn(),
    initializeEngine: jest.fn(),
    pollEmptyEngine: jest.fn(),
    stopPolling: jest.fn(),
    clearEngine: jest.fn(),
  };

  beforeEach(() => {
    setMockValues(values);
    setMockActions(actions);
    mockUseParams.mockReturnValue({ engineName: 'some-engine' });
  });

  describe('useEffect', () => {
    beforeEach(() => {
      shallow(<EngineRouter />);
    });

    it('sets engineName based on the current route parameters', () => {
      expect(actions.setEngineName).toHaveBeenCalledWith('some-engine');
    });

    it('initializes/fetches engine API data and starts a poll for empty engines', () => {
      expect(actions.initializeEngine).toHaveBeenCalled();
      expect(actions.pollEmptyEngine).toHaveBeenCalled();
    });

    it('clears engine and stops polling on unmount / on engine change', () => {
      unmountHandler();
      expect(actions.stopPolling).toHaveBeenCalled();
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

  it('renders a loading page template if async data is still loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<EngineRouter />);
    expect(wrapper.prop('isLoading')).toEqual(true);
  });

  // This would happen if a user jumps around from one engine route to another. If the engine name
  // on the path has changed, but we still have an engine stored in state, we do not want to load
  // any route views as they would be rendering with the wrong data.
  it('renders a loading page template if the engine stored in state is stale', () => {
    setMockValues({ ...values, engineName: 'some-engine' });
    mockUseParams.mockReturnValue({ engineName: 'some-new-engine' });
    const wrapper = shallow(<EngineRouter />);
    expect(wrapper.prop('isLoading')).toEqual(true);
  });

  it('renders a default engine overview', () => {
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Routes)).toHaveLength(1);
    expect(wrapper.find(EngineOverview)).toHaveLength(1);
  });

  it('renders an analytics view', () => {
    setMockValues({ ...values, myRole: { canViewEngineAnalytics: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(AnalyticsRouter)).toHaveLength(1);
  });

  it('renders a documents view', () => {
    setMockValues({ ...values, myRole: { canViewEngineDocuments: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Documents)).toHaveLength(1);
    expect(wrapper.find(DocumentDetail)).toHaveLength(1);
  });

  it('renders a schema view', () => {
    setMockValues({ ...values, myRole: { canViewEngineSchema: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(SchemaRouter)).toHaveLength(1);
  });

  it('renders a synonyms view', () => {
    setMockValues({ ...values, myRole: { canManageEngineSynonyms: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(Synonyms)).toHaveLength(1);
  });

  it('renders a curations view', () => {
    setMockValues({ ...values, myRole: { canManageEngineCurations: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(CurationsRouter)).toHaveLength(1);
  });

  it('renders a relevance tuning view', () => {
    setMockValues({ ...values, myRole: { canManageEngineRelevanceTuning: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(RelevanceTuning)).toHaveLength(1);
  });

  it('renders a result settings view', () => {
    setMockValues({ ...values, myRole: { canManageEngineResultSettings: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(ResultSettings)).toHaveLength(1);
  });

  it('renders an API logs view', () => {
    setMockValues({ ...values, myRole: { canViewEngineApiLogs: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(ApiLogs)).toHaveLength(1);
  });

  it('renders a search ui view', () => {
    setMockValues({ ...values, myRole: { canManageEngineSearchUi: true } });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(SearchUI)).toHaveLength(1);
  });

  it('renders a source engines view', () => {
    setMockValues({
      ...values,
      myRole: { canViewMetaEngineSourceEngines: true },
      isMetaEngine: true,
    });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(SourceEngines)).toHaveLength(1);
  });

  it('renders a crawler view', () => {
    setMockValues({ ...values, myRole: { canViewEngineCrawler: true }, isMetaEngine: false });
    const wrapper = shallow(<EngineRouter />);

    expect(wrapper.find(CrawlerRouter)).toHaveLength(1);
  });
});
