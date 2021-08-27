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

import { shallow } from 'enzyme';

import { SourcesTable } from '../../components/shared/sources_table';

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
  });

  it('does not render a page header when data is loading (to prevent a jump after redirect)', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<OrganizationSources />);

    expect(wrapper.prop('pageHeader')).toBeUndefined();
  });
});
