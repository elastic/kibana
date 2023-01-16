/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { ConfigSchema } from '../../plugin';
import { Subset } from '../../typings';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { SloDetailsPage } from '.';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useParams } from 'react-router-dom';
import { anSLO } from '../../data/slo';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/slo/use_fetch_slo_details');
jest.mock('../../hooks/use_breadcrumbs');

const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

const config: Subset<ConfigSchema> = {
  unsafe: {
    slo: { enabled: true },
  },
};

describe('SLO Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('renders the not found page when the feature flag is not enabled', async () => {
    useParamsMock.mockReturnValue(anSLO.id);
    useFetchSloDetailsMock.mockReturnValue({ loading: false, slo: anSLO });
    render(<SloDetailsPage />, { unsafe: { slo: { enabled: false } } });

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the not found page when the SLO cannot be found', async () => {
    useParamsMock.mockReturnValue('inexistant');
    useFetchSloDetailsMock.mockReturnValue({ loading: false, slo: undefined });
    render(<SloDetailsPage />, config);

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the loading spiner when fetching the SLO', async () => {
    useParamsMock.mockReturnValue(anSLO.id);
    useFetchSloDetailsMock.mockReturnValue({ loading: true, slo: undefined });
    render(<SloDetailsPage />, config);

    expect(screen.queryByTestId('pageNotFound')).toBeFalsy();
    expect(screen.queryByTestId('loadingTitle')).toBeTruthy();
    expect(screen.queryByTestId('loadingDetails')).toBeTruthy();
  });

  it('renders the SLO details page when the feature flag is enabled', async () => {
    useParamsMock.mockReturnValue(anSLO.id);
    useFetchSloDetailsMock.mockReturnValue({ loading: false, slo: anSLO });
    render(<SloDetailsPage />, config);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('sloDetails')).toBeTruthy();
  });
});
