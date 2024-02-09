/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { connector, resilientIncidentTypes, resilientSeverity } from '../mock';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import Fields from './case_fields';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

describe('ResilientParamsFields renders', () => {
  const useGetIncidentTypesResponse = {
    isLoading: false,
    isFetching: false,
    data: {
      data: resilientIncidentTypes,
    },
  };

  const useGetSeverityResponse = {
    isLoading: false,
    isFetching: false,
    data: {
      data: resilientSeverity,
    },
  };

  const fields = {
    severityCode: '6',
    incidentTypes: ['19'],
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    jest.clearAllMocks();
  });

  it('all params fields are rendered', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByText('Malware')).toBeInTheDocument();
    expect(await screen.findByTestId('severitySelect')).toHaveValue('6');
  });

  it('disabled the fields when loading incident types', async () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(
      await within(await screen.findByTestId('incidentTypeComboBox')).findByRole('combobox')
    ).toBeDisabled();
  });

  it('disabled the fields when loading severity', async () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('severitySelect')).toBeDisabled();
  });

  it('sets issue type correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const checkbox = within(await screen.findByTestId('incidentTypeComboBox')).getByTestId(
      'comboBoxSearchInput'
    );

    userEvent.type(checkbox, 'Denial of Service{enter}');

    expect(await screen.findByText('Denial of Service')).toBeInTheDocument();
  });

  it('sets severity correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(await screen.findByTestId('severitySelect'), 'Low');
    expect(await screen.findByText('Low')).toBeInTheDocument();
  });

  it('should submit a resilient connector', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('incidentTypeComboBox')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Low' }));

    const checkbox = within(await screen.findByTestId('incidentTypeComboBox')).getByTestId(
      'comboBoxSearchInput'
    );

    userEvent.type(checkbox, 'Denial of Service{enter}');

    userEvent.selectOptions(await screen.findByTestId('severitySelect'), ['4']);

    expect(await screen.findByText('Denial of Service')).toBeInTheDocument();
    expect(await screen.findByText('Low')).toBeInTheDocument();
  });
});
