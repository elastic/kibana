/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
  renderWithTheme,
} from '../../../../utils/test_helpers';
import { InstanceDetails } from './intance_details';
import * as useInstanceDetailsFetcher from './use_instance_details_fetcher';

type ServiceInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

describe('InstanceDetails', () => {
  it('renders loading spinner when data is being fetched', () => {
    jest
      .spyOn(useInstanceDetailsFetcher, 'useInstanceDetailsFetcher')
      .mockReturnValue({ data: undefined, status: FETCH_STATUS.LOADING });
    const { getByTestId } = renderWithTheme(
      <InstanceDetails serviceName="foo" serviceNodeName="bar" kuery="" />
    );
    expect(getByTestId('loadingSpinner')).toBeInTheDocument();
  });

  it('renders all sections', () => {
    jest
      .spyOn(useInstanceDetailsFetcher, 'useInstanceDetailsFetcher')
      .mockReturnValue({
        data: {
          service: { node: { name: 'foo' } },
          container: { id: 'baz' },
          cloud: { provider: 'bar' },
        } as ServiceInstanceDetails,
        status: FETCH_STATUS.SUCCESS,
      });
    const component = renderWithTheme(
      <InstanceDetails serviceName="foo" serviceNodeName="bar" kuery="" />
    );
    expectTextsInDocument(component, ['Service', 'Container', 'Cloud']);
  });

  it('hides service section', () => {
    jest
      .spyOn(useInstanceDetailsFetcher, 'useInstanceDetailsFetcher')
      .mockReturnValue({
        data: {
          container: { id: 'baz' },
          cloud: { provider: 'bar' },
        } as ServiceInstanceDetails,
        status: FETCH_STATUS.SUCCESS,
      });
    const component = renderWithTheme(
      <InstanceDetails serviceName="foo" serviceNodeName="bar" kuery="" />
    );
    expectTextsInDocument(component, ['Container', 'Cloud']);
    expectTextsNotInDocument(component, ['Service']);
  });

  it('hides container section', () => {
    jest
      .spyOn(useInstanceDetailsFetcher, 'useInstanceDetailsFetcher')
      .mockReturnValue({
        data: {
          service: { node: { name: 'foo' } },
          cloud: { provider: 'bar' },
        } as ServiceInstanceDetails,
        status: FETCH_STATUS.SUCCESS,
      });
    const component = renderWithTheme(
      <InstanceDetails serviceName="foo" serviceNodeName="bar" kuery="" />
    );
    expectTextsInDocument(component, ['Service', 'Cloud']);
    expectTextsNotInDocument(component, ['Container']);
  });

  it('hides cloud section', () => {
    jest
      .spyOn(useInstanceDetailsFetcher, 'useInstanceDetailsFetcher')
      .mockReturnValue({
        data: {
          service: { node: { name: 'foo' } },
          container: { id: 'baz' },
        } as ServiceInstanceDetails,
        status: FETCH_STATUS.SUCCESS,
      });
    const component = renderWithTheme(
      <InstanceDetails serviceName="foo" serviceNodeName="bar" kuery="" />
    );
    expectTextsInDocument(component, ['Service', 'Container']);
    expectTextsNotInDocument(component, ['Cloud']);
  });
});
