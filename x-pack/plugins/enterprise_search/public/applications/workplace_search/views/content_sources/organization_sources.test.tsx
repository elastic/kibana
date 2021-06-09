/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { contentSources } from '../../__mocks__/content_sources.mock';

import React from 'react';
import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Loading } from '../../../shared/loading';
import { SourcesTable } from '../../components/shared/sources_table';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';

import { OrganizationSources } from './organization_sources';

describe('OrganizationSources', () => {
  const initializeSources = jest.fn();
  const setSourceSearchability = jest.fn();

  const mockValues = {
    contentSources,
    dataLoading: false,
  };

  beforeEach(() => {
    setMockActions({
      initializeSources,
      setSourceSearchability,
    });
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<OrganizationSources />);

    expect(wrapper.find(SourcesTable)).toHaveLength(1);
    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<OrganizationSources />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('returns redirect when no sources', () => {
    setMockValues({ ...mockValues, contentSources: [] });
    const wrapper = shallow(<OrganizationSources />);

    expect(wrapper.find(Redirect).prop('to')).toEqual(getSourcesPath(ADD_SOURCE_PATH, true));
  });
});
