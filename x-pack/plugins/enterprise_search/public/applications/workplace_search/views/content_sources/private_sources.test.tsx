/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';

import { PrivateSources } from './private_sources';
import { SourcesView } from './sources_view';

describe('PrivateSources', () => {
  const mockValues = {
    account: { canCreatePersonalSources: false, groups: [] },
    dataLoading: false,
    contentSources: [],
    privateContentSources: [],
    serviceTypes: [],
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockActions({ initializeSources: jest.fn() });
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(SourcesView)).toHaveLength(1);
  });

  it('renders Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders only shared sources section when canCreatePersonalSources is false', () => {
    setMockValues({ ...mockValues });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(ContentSection)).toHaveLength(1);
  });

  it('renders both shared and private sources sections when canCreatePersonalSources is true', () => {
    setMockValues({ ...mockValues, account: { canCreatePersonalSources: true, groups: [] } });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(ContentSection)).toHaveLength(2);
  });

  it('renders license callout when has private sources with non-Platinum license', () => {
    setMockValues({
      ...mockValues,
      privateContentSources: ['source1', 'source2'],
      hasPlatinumLicense: false,
      account: { canCreatePersonalSources: true, groups: [] },
    });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('renders an action button when user can add private sources', () => {
    setMockValues({
      ...mockValues,
      account: { canCreatePersonalSources: true, groups: [] },
      serviceTypes: [{ configured: true }],
    });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(ContentSection).first().prop('action')).toBeTruthy();
  });

  it('renders empty prompts if no sources are available', () => {
    setMockValues({
      ...mockValues,
      account: { canCreatePersonalSources: true, groups: [] },
    });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(2);
  });

  it('renders SourcesTable if sources are available', () => {
    setMockValues({
      ...mockValues,
      account: { canCreatePersonalSources: true, groups: [] },
      contentSources: ['1', '2'],
      privateContentSources: ['1', '2'],
    });
    const wrapper = shallow(<PrivateSources />);

    expect(wrapper.find(SourcesTable)).toHaveLength(2);
  });
});
