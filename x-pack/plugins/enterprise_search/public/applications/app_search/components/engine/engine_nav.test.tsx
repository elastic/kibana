/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';
import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, mount } from 'enzyme';
import { Switch, useParams } from 'react-router-dom';
import { EuiBadge } from '@elastic/eui';

import { EngineRouter, EngineNav } from './';

describe('EngineRouter', () => {
  it('renders a default engine overview', () => {
    setMockValues({ myRole: {} });
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

describe('EngineNav', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ engineName: 'some-engine' });
  });

  it('does not render without an engine name', () => {
    setMockValues({ myRole: {} });
    (useParams as jest.Mock).mockReturnValue({ engineName: '' });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders an engine label', () => {
    setMockValues({ myRole: {} });
    const wrapper = mount(<EngineNav />);

    const label = wrapper.find('[data-test-subj="EngineLabel"]').last();
    expect(label.text()).toEqual(expect.stringContaining('SOME-ENGINE'));

    // TODO: Test sample & meta engine conditional rendering
    expect(label.find(EuiBadge).text()).toEqual('SAMPLE ENGINE');
  });

  it('renders a default engine overview link', () => {
    setMockValues({ myRole: {} });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineOverviewLink"]')).toHaveLength(1);
  });

  it('renders an analytics link', () => {
    setMockValues({ myRole: { canViewEngineAnalytics: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineAnalyticsLink"]')).toHaveLength(1);
  });

  it('renders a documents link', () => {
    setMockValues({ myRole: { canViewEngineDocuments: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineDocumentsLink"]')).toHaveLength(1);
  });

  it('renders a schema link', () => {
    setMockValues({ myRole: { canViewEngineSchema: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSchemaLink"]')).toHaveLength(1);

    // TODO: Schema warning icon
  });

  // TODO: Unskip when EngineLogic is migrated
  it.skip('renders a crawler link', () => {
    setMockValues({ myRole: { canViewEngineCrawler: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineCrawlerLink"]')).toHaveLength(1);

    // TODO: Test that the crawler link does NOT show up for meta/sample engines
  });

  // TODO: Unskip when EngineLogic is migrated
  it.skip('renders a meta engine source engines link', () => {
    setMockValues({ myRole: { canViewMetaEngineSourceEngines: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="MetaEngineEnginesLink"]')).toHaveLength(1);

    // TODO: Test that the crawler link does NOT show up for non-meta engines
  });

  it('renders a relevance tuning link', () => {
    setMockValues({ myRole: { canManageEngineRelevanceTuning: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineRelevanceTuningLink"]')).toHaveLength(1);

    // TODO: Boost error icon
  });

  it('renders a synonyms link', () => {
    setMockValues({ myRole: { canManageEngineSynonyms: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSynonymsLink"]')).toHaveLength(1);
  });

  it('renders a curations link', () => {
    setMockValues({ myRole: { canManageEngineCurations: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineCurationsLink"]')).toHaveLength(1);
  });

  it('renders a results settings link', () => {
    setMockValues({ myRole: { canManageEngineResultSettings: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineResultSettingsLink"]')).toHaveLength(1);
  });

  it('renders a Search UI link', () => {
    setMockValues({ myRole: { canManageEngineSearchUi: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSearchUILink"]')).toHaveLength(1);
  });

  it('renders an API logs link', () => {
    setMockValues({ myRole: { canViewEngineApiLogs: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineAPILogsLink"]')).toHaveLength(1);
  });
});
