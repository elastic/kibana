/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { act } from 'react-dom/test-utils';

import { DataView } from '@kbn/data-views-plugin/common';

import { FormulaPublicApi } from '@kbn/lens-plugin/public';

import { withLensData } from './with_lens_data';

interface MockComponentProps {
  name: string;
}

interface MockComponentLensProps {
  data: string;
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('withLensData', () => {
  const MockComponent: React.FC<MockComponentProps> = ({ name }) => <div>{name}</div>;

  beforeEach(() => {
    setMockValues({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the wrapped component with the data prop', () => {
    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(() => {
          return { data: 'initial data' };
        }),
        getAttributes: jest.fn(),
        getDataViewQuery: jest.fn(),
        initialValues: { data: 'initial data' },
      }
    );

    const props = { name: 'John Doe' };
    const wrapper = shallow(
      <WrappedComponent id={'id'} timeRange={{ from: 'now-10d', to: 'now' }} {...props} />
    );
    expect(wrapper.find(MockComponent).prop('data')).toEqual('initial data');
  });

  it('should call getDataViewQuery with props', async () => {
    const getDataViewQuery = jest.fn();
    getDataViewQuery.mockReturnValue('title-collection');
    const findMock = jest.spyOn(mockKibanaValues.data.dataViews, 'find').mockResolvedValueOnce([]);
    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes: jest.fn(),
        getDataViewQuery,
        initialValues: { data: 'initial data' },
      }
    );

    const props = { id: 'id', name: 'John Doe', timeRange: { from: 'now-10d', to: 'now' } };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(getDataViewQuery).toHaveBeenCalledWith(props);
    expect(findMock).toHaveBeenCalledWith('title-collection', 1);
  });

  it('should call getAttributes with the correct arguments when dataView and formula are available', async () => {
    const getAttributes = jest.fn();
    const dataView = {} as DataView;
    const formula = {} as FormulaPublicApi;
    mockKibanaValues.lens.stateHelperApi = jest.fn().mockResolvedValueOnce({ formula });
    jest.spyOn(mockKibanaValues.data.dataViews, 'find').mockResolvedValueOnce([dataView]);

    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes,
        getDataViewQuery: jest.fn(),
        initialValues: { data: 'initial data' },
      }
    );

    const props = { id: 'id', name: 'John Doe', timeRange: { from: 'now-10d', to: 'now' } };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(getAttributes).toHaveBeenCalledWith(dataView, formula, props);
  });

  it('should not call getAttributes when dataView is not available', async () => {
    const getAttributes = jest.fn();
    const formula = {} as FormulaPublicApi;
    mockKibanaValues.lens.stateHelperApi = jest.fn().mockResolvedValueOnce({ formula });
    jest.spyOn(mockKibanaValues.data.dataViews, 'find').mockResolvedValueOnce([]);

    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes,
        getDataViewQuery: jest.fn(),
        initialValues: { data: 'initial data' },
      }
    );

    const props = { id: 'id', name: 'John Doe', timeRange: { from: 'now-10d', to: 'now' } };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(getAttributes).not.toHaveBeenCalled();
  });
});
