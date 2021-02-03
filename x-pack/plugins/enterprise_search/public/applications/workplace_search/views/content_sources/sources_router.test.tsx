/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { Route, Switch, Redirect } from 'react-router-dom';

import { ADD_SOURCE_PATH, PERSONAL_SOURCES_PATH, SOURCES_PATH, getSourcesPath } from '../../routes';

import { SourcesRouter } from './sources_router';

describe('SourcesRouter', () => {
  const resetSourcesState = jest.fn();
  const mockValues = {
    account: { canCreatePersonalSources: true },
    isOrganization: true,
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockActions({
      resetSourcesState,
    });
    setMockValues({ ...mockValues });
  });

  it('renders sources routes', () => {
    const TOTAL_ROUTES = 62;
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(TOTAL_ROUTES);
  });

  it('redirects when nonplatinum license and accountOnly context', () => {
    setMockValues({ ...mockValues, hasPlatinumLicense: false });
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find(Redirect).first().prop('from')).toEqual(ADD_SOURCE_PATH);
    expect(wrapper.find(Redirect).first().prop('to')).toEqual(SOURCES_PATH);
  });

  it('redirects when cannot create sources', () => {
    setMockValues({ ...mockValues, account: { canCreatePersonalSources: false } });
    const wrapper = shallow(<SourcesRouter />);

    expect(wrapper.find(Redirect).last().prop('from')).toEqual(
      getSourcesPath(ADD_SOURCE_PATH, false)
    );
    expect(wrapper.find(Redirect).last().prop('to')).toEqual(PERSONAL_SOURCES_PATH);
  });
});
