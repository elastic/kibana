/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import { contentSources } from '../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { Route } from '@kbn/shared-ux-router';

import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../components/layout';

import { DisplaySettingsRouter } from './components/display_settings';
import { Overview } from './components/overview';
import { Schema } from './components/schema';
import { SchemaChangeErrors } from './components/schema/schema_change_errors';
import { SourceContent } from './components/source_content';
import { SourceSettings } from './components/source_settings';
import { SourceRouter } from './source_router';

describe('SourceRouter', () => {
  const initializeSource = jest.fn();
  const resetSourceState = jest.fn();
  const contentSource = contentSources[1];
  const customSource = contentSources[0];
  const mockValues = {
    contentSource,
    dataLoading: false,
    isOrganization: true,
  };

  beforeEach(() => {
    setMockActions({
      initializeSource,
      resetSourceState,
    });
    setMockValues({ ...mockValues });
    mockUseParams.mockImplementationOnce(() => ({
      sourceId: contentSource.id,
    }));
  });

  describe('mount/unmount events', () => {
    it('fetches & initializes source data on mount', () => {
      shallow(<SourceRouter />);

      expect(initializeSource).toHaveBeenCalledWith(contentSource.id);
    });

    it('resets state on unmount', () => {
      shallow(<SourceRouter />);
      unmountHandler();

      expect(resetSourceState).toHaveBeenCalled();
    });
  });

  describe('loading state when fetching source data', () => {
    // NOTE: The early page isLoading returns are required to prevent a flash of a completely empty
    // page (instead of preserving the layout/side nav while loading). We also cannot let the code
    // fall through to the router because some routes are conditionally rendered based on isCustomSource.

    it('returns an empty loading Workplace Search page on organization views', () => {
      setMockValues({ ...mockValues, dataLoading: true, isOrganization: true });
      const wrapper = shallow(<SourceRouter />);

      expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
      expect(wrapper.prop('isLoading')).toEqual(true);
    });

    it('returns an empty loading personal dashboard page when not on an organization view', () => {
      setMockValues({ ...mockValues, dataLoading: true, isOrganization: false });
      const wrapper = shallow(<SourceRouter />);

      expect(wrapper.type()).toEqual(PersonalDashboardLayout);
      expect(wrapper.prop('isLoading')).toEqual(true);
    });
  });

  it('renders source routes (standard)', () => {
    const wrapper = shallow(<SourceRouter />);

    expect(wrapper.find(Overview)).toHaveLength(1);
    expect(wrapper.find(SourceSettings)).toHaveLength(1);
    expect(wrapper.find(SourceContent)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(5);
  });

  it('renders source routes (custom)', () => {
    setMockValues({ ...mockValues, contentSource: customSource });
    const wrapper = shallow(<SourceRouter />);

    expect(wrapper.find(DisplaySettingsRouter)).toHaveLength(1);
    expect(wrapper.find(Schema)).toHaveLength(1);
    expect(wrapper.find(SchemaChangeErrors)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(7);
  });
});
