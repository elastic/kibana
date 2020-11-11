/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiBadge, EuiIcon } from '@elastic/eui';

import { EngineNav } from './';

describe('EngineNav', () => {
  const values = { myRole: {}, engineName: 'some-engine', dataLoading: false, engine: {} };

  beforeEach(() => {
    setMockValues(values);
  });

  it('does not render if async data is still loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('does not render without an engine name', () => {
    setMockValues({ ...values, engineName: '' });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders an engine label and badges', () => {
    setMockValues({ ...values, isSampleEngine: false, isMetaEngine: false });
    const wrapper = shallow(<EngineNav />);
    const label = wrapper.find('[data-test-subj="EngineLabel"]').find('.eui-textTruncate');

    expect(label.text()).toEqual('SOME-ENGINE');
    expect(wrapper.find(EuiBadge)).toHaveLength(0);

    setMockValues({ ...values, isSampleEngine: true });
    wrapper.setProps({}); // Re-render
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('SAMPLE ENGINE');

    setMockValues({ ...values, isMetaEngine: true });
    wrapper.setProps({}); // Re-render
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('META ENGINE');
  });

  it('renders a default engine overview link', () => {
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineOverviewLink"]')).toHaveLength(1);
  });

  it('renders an analytics link', () => {
    setMockValues({ ...values, myRole: { canViewEngineAnalytics: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineAnalyticsLink"]')).toHaveLength(1);
  });

  it('renders a documents link', () => {
    setMockValues({ ...values, myRole: { canViewEngineDocuments: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineDocumentsLink"]')).toHaveLength(1);
  });

  it('renders a schema link', () => {
    setMockValues({ ...values, myRole: { canViewEngineSchema: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSchemaLink"]')).toHaveLength(1);
  });

  describe('schema nav icons', () => {
    const myRole = { canViewEngineSchema: true };

    it('renders unconfirmed schema fields info icon', () => {
      setMockValues({ ...values, myRole, hasUnconfirmedSchemaFields: true });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineNavSchemaUnconfirmedFields"]')).toHaveLength(1);
    });

    it('renders schema conflicts alert icon', () => {
      setMockValues({ ...values, myRole, hasSchemaConflicts: true });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineNavSchemaConflicts"]')).toHaveLength(1);
    });
  });

  describe('crawler link', () => {
    const myRole = { canViewEngineCrawler: true };

    it('renders', () => {
      setMockValues({ ...values, myRole });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineCrawlerLink"]')).toHaveLength(1);
    });

    it('does not render for meta engines', () => {
      setMockValues({ ...values, myRole, isMetaEngine: true });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineCrawlerLink"]')).toHaveLength(0);
    });

    it('does not render for sample engine', () => {
      setMockValues({ ...values, myRole, isSampleEngine: true });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineCrawlerLink"]')).toHaveLength(0);
    });
  });

  describe('meta engine source engines link', () => {
    const myRole = { canViewMetaEngineSourceEngines: true };

    it('renders', () => {
      setMockValues({ ...values, myRole, isMetaEngine: true });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="MetaEngineEnginesLink"]')).toHaveLength(1);
    });

    it('does not render for non meta engines', () => {
      setMockValues({ ...values, myRole, isMetaEngine: false });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="MetaEngineEnginesLink"]')).toHaveLength(0);
    });
  });

  it('renders a relevance tuning link', () => {
    setMockValues({ ...values, myRole: { canManageEngineRelevanceTuning: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineRelevanceTuningLink"]')).toHaveLength(1);
  });

  describe('relevance tuning nav icons', () => {
    const myRole = { canManageEngineRelevanceTuning: true };

    it('renders unconfirmed schema fields info icon', () => {
      const engine = { unsearchedUnconfirmedFields: true };
      setMockValues({ ...values, myRole, engine });
      const wrapper = shallow(<EngineNav />);
      expect(
        wrapper.find('[data-test-subj="EngineNavRelevanceTuningUnsearchedFields"]')
      ).toHaveLength(1);
    });

    it('renders schema conflicts alert icon', () => {
      const engine = { invalidBoosts: true };
      setMockValues({ ...values, myRole, engine });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find('[data-test-subj="EngineNavRelevanceTuningInvalidBoosts"]')).toHaveLength(
        1
      );
    });

    it('can render multiple icons', () => {
      const engine = { invalidBoosts: true, unsearchedUnconfirmedFields: true };
      setMockValues({ ...values, myRole, engine });
      const wrapper = shallow(<EngineNav />);
      expect(wrapper.find(EuiIcon)).toHaveLength(2);
    });
  });

  it('renders a synonyms link', () => {
    setMockValues({ ...values, myRole: { canManageEngineSynonyms: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSynonymsLink"]')).toHaveLength(1);
  });

  it('renders a curations link', () => {
    setMockValues({ ...values, myRole: { canManageEngineCurations: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineCurationsLink"]')).toHaveLength(1);
  });

  it('renders a results settings link', () => {
    setMockValues({ ...values, myRole: { canManageEngineResultSettings: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineResultSettingsLink"]')).toHaveLength(1);
  });

  it('renders a Search UI link', () => {
    setMockValues({ ...values, myRole: { canManageEngineSearchUi: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineSearchUILink"]')).toHaveLength(1);
  });

  it('renders an API logs link', () => {
    setMockValues({ ...values, myRole: { canViewEngineApiLogs: true } });
    const wrapper = shallow(<EngineNav />);
    expect(wrapper.find('[data-test-subj="EngineAPILogsLink"]')).toHaveLength(1);
  });
});
