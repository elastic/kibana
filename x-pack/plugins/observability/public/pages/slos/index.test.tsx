/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { useCreateOrUpdateSlo } from '../../hooks/slo/use_create_slo';
import { useDeleteSlo } from '../../hooks/slo/use_delete_slo';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { useFetchHistoricalSummary } from '../../hooks/slo/use_fetch_historical_summary';
import { useLicense } from '../../hooks/use_license';
import { SlosPage } from '.';
import { emptySloList, sloList } from '../../data/slo/slo';
import type { ConfigSchema } from '../../plugin';
import type { Subset } from '../../typings';
import { historicalSummaryData } from '../../data/slo/historical_summary_data';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/slo/use_fetch_slo_list');
jest.mock('../../hooks/slo/use_create_slo');
jest.mock('../../hooks/slo/use_delete_slo');
jest.mock('../../hooks/slo/use_fetch_historical_summary');

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;
const useCreateOrUpdateSloMock = useCreateOrUpdateSlo as jest.Mock;
const useDeleteSloMock = useDeleteSlo as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;

const mockCreateSlo = jest.fn();
useCreateOrUpdateSloMock.mockReturnValue({ createSlo: mockCreateSlo });

const mockDeleteSlo = jest.fn();
useDeleteSloMock.mockReturnValue({ deleteSlo: mockDeleteSlo });

const mockNavigate = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      charts: chartPluginMock.createSetupContract(),
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
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

describe('SLOs Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  describe('when the feature flag is not enabled', () => {
    it('renders the not found page ', async () => {
      useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SlosPage />, { unsafe: { slo: { enabled: false } } });

      expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
    });
  });

  describe('when the feature flag is enabled', () => {
    describe('when the incorrect license is found', () => {
      it('renders the welcome prompt with subscription buttons', async () => {
        useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });
        useLicenseMock.mockReturnValue({ hasAtLeast: () => false });

        render(<SlosPage />, config);

        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();
        expect(screen.queryByTestId('slosPageWelcomePromptSignupForCloudButton')).toBeTruthy();
        expect(screen.queryByTestId('slosPageWelcomePromptSignupForLicenseButton')).toBeTruthy();
      });
    });

    describe('when the correct license is found', () => {
      beforeEach(() => {
        useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
      });

      it('renders nothing when the API is loading', async () => {
        useFetchSloListMock.mockReturnValue({ loading: true, sloList: emptySloList });

        const { container } = render(<SlosPage />, config);

        expect(container).toBeEmptyDOMElement();
      });

      it('renders the SLOs Welcome Prompt when the API has finished loading and there are no results', async () => {
        useFetchSloListMock.mockReturnValue({ loading: false, sloList: emptySloList });

        render(<SlosPage />, config);

        expect(screen.queryByTestId('slosPageWelcomePrompt')).toBeTruthy();
      });

      it('should have a create new SLO button', () => {
        useFetchSloListMock.mockReturnValue({ loading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          loading: false,
          data: historicalSummaryData,
        });

        render(<SlosPage />, config);

        expect(screen.getByText('Create new SLO')).toBeTruthy();
      });

      describe('when API has returned results', () => {
        it('renders the SLO list with SLO items', async () => {
          useFetchSloListMock.mockReturnValue({ loading: false, sloList });

          useFetchHistoricalSummaryMock.mockReturnValue({
            loading: false,
            data: historicalSummaryData,
          });

          render(<SlosPage />, config);

          expect(screen.queryByTestId('slosPage')).toBeTruthy();
          expect(screen.queryByTestId('sloList')).toBeTruthy();
          expect(screen.queryAllByTestId('sloItem')).toBeTruthy();
          expect(screen.queryAllByTestId('sloItem').length).toBe(sloList.results.length);
        });

        it('allows editing an SLO', async () => {
          useFetchSloListMock.mockReturnValue({ loading: false, sloList });

          useFetchHistoricalSummaryMock.mockReturnValue({
            loading: false,
            data: historicalSummaryData,
          });

          render(<SlosPage />, config);

          screen.getAllByLabelText('Actions').at(0)?.click();

          await waitForEuiPopoverOpen();

          const button = screen.getByTestId('sloActionsEdit');

          expect(button).toBeTruthy();

          button.click();

          expect(mockNavigate).toBeCalled();
        });

        it('allows deleting an SLO', async () => {
          useFetchSloListMock.mockReturnValue({ loading: false, sloList });

          useFetchHistoricalSummaryMock.mockReturnValue({
            loading: false,
            data: historicalSummaryData,
          });

          render(<SlosPage />, config);

          screen.getAllByLabelText('Actions').at(0)?.click();

          await waitForEuiPopoverOpen();

          const button = screen.getByTestId('sloActionsDelete');

          expect(button).toBeTruthy();

          button.click();

          screen.getByTestId('confirmModalConfirmButton').click();

          expect(mockDeleteSlo).toBeCalledWith(sloList.results.at(0)?.id);
        });

        it('allows cloning an SLO', async () => {
          useFetchSloListMock.mockReturnValue({ loading: false, sloList });

          useFetchHistoricalSummaryMock.mockReturnValue({
            loading: false,
            data: historicalSummaryData,
          });

          render(<SlosPage />, config);

          screen.getAllByLabelText('Actions').at(0)?.click();

          await waitForEuiPopoverOpen();

          const button = screen.getByTestId('sloActionsClone');

          expect(button).toBeTruthy();

          button.click();

          expect(mockCreateSlo).toBeCalled();
        });
      });
    });
  });
});
