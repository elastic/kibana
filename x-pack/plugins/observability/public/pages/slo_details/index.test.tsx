/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { useKibana } from '../../utils/kibana_react';
import { useParams } from 'react-router-dom';
import { useLicense } from '../../hooks/use_license';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { render } from '../../utils/test_helper';
import { SloDetailsPage } from '.';
import { buildSlo } from '../../data/slo/slo';
import type { ConfigSchema } from '../../plugin';
import type { Subset } from '../../typings';
import { paths } from '../../config';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/slo/use_fetch_slo_details');

const useKibanaMock = useKibana as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;

const mockNavigate = jest.fn();
const mockBasePathPrepend = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      http: {
        basePath: {
          prepend: mockBasePathPrepend,
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

  describe('when the feature flag is not enabled', () => {
    it('renders the not found page', async () => {
      const slo = buildSlo();
      useParamsMock.mockReturnValue(slo.id);
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />, { unsafe: { slo: { enabled: false } } });

      expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
    });
  });

  describe('when the feature flag is enabled', () => {
    describe('when the incorrect license is found', () => {
      it('navigates to the SLO List page', async () => {
        const slo = buildSlo();
        useParamsMock.mockReturnValue(slo.id);
        useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
        useLicenseMock.mockReturnValue({ hasAtLeast: () => false });

        render(<SloDetailsPage />, { unsafe: { slo: { enabled: true } } });

        expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
      });
    });

    describe('when the correct license is found', () => {
      it('renders the not found page when the SLO cannot be found', async () => {
        useParamsMock.mockReturnValue('nonexistent');
        useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo: undefined });
        useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

        render(<SloDetailsPage />, config);

        expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
      });

      it('renders the loading spinner when fetching the SLO', async () => {
        const slo = buildSlo();
        useParamsMock.mockReturnValue(slo.id);
        useFetchSloDetailsMock.mockReturnValue({ isLoading: true, slo: undefined });
        useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

        render(<SloDetailsPage />, config);

        expect(screen.queryByTestId('pageNotFound')).toBeFalsy();
        expect(screen.queryByTestId('loadingTitle')).toBeTruthy();
        expect(screen.queryByTestId('loadingDetails')).toBeTruthy();
      });

      it('renders the SLO details page', async () => {
        const slo = buildSlo();
        useParamsMock.mockReturnValue(slo.id);
        useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
        useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

        render(<SloDetailsPage />, config);

        expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
        expect(screen.queryByTestId('sloDetails')).toBeTruthy();
      });
    });
  });
});
