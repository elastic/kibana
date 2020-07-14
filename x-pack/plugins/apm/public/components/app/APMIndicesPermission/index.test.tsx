/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { shallow } from 'enzyme';
import { APMIndicesPermission } from './';

import * as hooks from '../../../hooks/useFetcher';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../utils/testHelpers';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';

describe('APMIndicesPermission', () => {
  it('returns empty component when api status is loading', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });
    const component = shallow(<APMIndicesPermission />);
    expect(component.isEmptyRender()).toBeTruthy();
  });
  it('returns empty component when api status is pending', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.PENDING,
      refetch: jest.fn(),
    });
    const component = shallow(<APMIndicesPermission />);
    expect(component.isEmptyRender()).toBeTruthy();
  });
  it('renders missing permission page', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        has_all_requested: false,
        index: {
          'apm-*': { read: false },
        },
      },
      refetch: jest.fn(),
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission />
      </MockApmPluginContextWrapper>
    );
    expectTextsInDocument(component, [
      'Missing permissions to access APM',
      'Dismiss',
      'apm-*',
    ]);
  });

  it('shows children component when no index is returned', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        has_all_requested: false,
        index: {},
      },
      refetch: jest.fn(),
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsNotInDocument(component, ['Missing permissions to access APM']);
    expectTextsInDocument(component, ['My amazing component']);
  });

  it('shows children component when indices have read privileges', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        has_all_requested: true,
        index: {},
      },
      refetch: jest.fn(),
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsNotInDocument(component, ['Missing permissions to access APM']);
    expectTextsInDocument(component, ['My amazing component']);
  });

  it('dismesses the warning by clicking on the escape hatch', () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      data: {
        has_all_requested: false,
        index: {
          'apm-error-*': { read: false },
          'apm-trasanction-*': { read: false },
          'apm-metrics-*': { read: true },
          'apm-span-*': { read: true },
        },
      },
      refetch: jest.fn(),
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsInDocument(component, [
      'Dismiss',
      'apm-error-*',
      'apm-trasanction-*',
    ]);
    act(() => {
      fireEvent.click(component.getByText('Dismiss'));
    });
    expectTextsInDocument(component, ['My amazing component']);
  });

  it("shows children component when api doesn't return value", () => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
    const component = render(
      <MockApmPluginContextWrapper>
        <APMIndicesPermission>
          <p>My amazing component</p>
        </APMIndicesPermission>
      </MockApmPluginContextWrapper>
    );
    expectTextsNotInDocument(component, [
      'Missing permissions to access APM',
      'apm-7.5.1-error-*',
      'apm-7.5.1-metric-*',
      'apm-7.5.1-transaction-*',
      'apm-7.5.1-span-*',
    ]);
    expectTextsInDocument(component, ['My amazing component']);
  });
});
