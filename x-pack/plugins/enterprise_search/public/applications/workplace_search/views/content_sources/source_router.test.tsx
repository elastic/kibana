/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__';
import { mockLocation } from '../../../__mocks__/react_router_history.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import { contentSources } from '../../__mocks__/content_sources.mock';

import React from 'react';
import { useParams } from 'react-router-dom';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { NAV } from '../../constants';

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
  };

  beforeEach(() => {
    setMockActions({
      initializeSource,
      resetSourceState,
    });
    setMockValues({ ...mockValues });
    (useParams as jest.Mock).mockImplementationOnce(() => ({
      sourceId: contentSource.id,
    }));
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<SourceRouter />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders source routes (standard)', () => {
    const wrapper = shallow(<SourceRouter />);

    expect(wrapper.find(Overview)).toHaveLength(1);
    expect(wrapper.find(SourceSettings)).toHaveLength(1);
    expect(wrapper.find(SourceContent)).toHaveLength(1);
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(3);
  });

  it('renders source routes (custom)', () => {
    setMockValues({ ...mockValues, contentSource: customSource });
    const wrapper = shallow(<SourceRouter />);

    expect(wrapper.find(DisplaySettingsRouter)).toHaveLength(1);
    expect(wrapper.find(Schema)).toHaveLength(1);
    expect(wrapper.find(SchemaChangeErrors)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(6);
  });

  it('handles breadcrumbs while loading (standard)', () => {
    setMockValues({
      ...mockValues,
      contentSource: {},
    });

    const loadingBreadcrumbs = ['Sources', '...'];

    const wrapper = shallow(<SourceRouter />);

    const overviewBreadCrumb = wrapper.find(SetPageChrome).at(0);
    const contentBreadCrumb = wrapper.find(SetPageChrome).at(1);
    const settingsBreadCrumb = wrapper.find(SetPageChrome).at(2);

    expect(overviewBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs]);
    expect(contentBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs, NAV.CONTENT]);
    expect(settingsBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs, NAV.SETTINGS]);
  });

  it('handles breadcrumbs while loading (custom)', () => {
    setMockValues({
      ...mockValues,
      contentSource: { serviceType: 'custom' },
    });

    const loadingBreadcrumbs = ['Sources', '...'];

    const wrapper = shallow(<SourceRouter />);

    const schemaBreadCrumb = wrapper.find(SetPageChrome).at(2);
    const schemaErrorsBreadCrumb = wrapper.find(SetPageChrome).at(3);
    const displaySettingsBreadCrumb = wrapper.find(SetPageChrome).at(4);

    expect(schemaBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs, NAV.SCHEMA]);
    expect(schemaErrorsBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs, NAV.SCHEMA]);
    expect(displaySettingsBreadCrumb.prop('trail')).toEqual([
      ...loadingBreadcrumbs,
      NAV.DISPLAY_SETTINGS,
    ]);
  });

  describe('reset state', () => {
    it('does not reset state when switching between source tree views', () => {
      mockLocation.pathname = `/sources/${contentSource.id}`;
      shallow(<SourceRouter />);
      unmountHandler();

      expect(resetSourceState).not.toHaveBeenCalled();
    });

    it('resets state when leaving source tree', () => {
      mockLocation.pathname = '/home';
      shallow(<SourceRouter />);
      unmountHandler();

      expect(resetSourceState).toHaveBeenCalled();
    });
  });
});
