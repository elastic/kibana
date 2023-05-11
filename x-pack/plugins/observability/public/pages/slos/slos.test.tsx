/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, waitFor } from '@testing-library/react';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { useCreateSlo } from '../../hooks/slo/use_create_slo';
import { useCloneSlo } from '../../hooks/slo/use_clone_slo';
import { useDeleteSlo } from '../../hooks/slo/use_delete_slo';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { useFetchHistoricalSummary } from '../../hooks/slo/use_fetch_historical_summary';
import { useLicense } from '../../hooks/use_license';
import { SlosPage } from './slos';
import { emptySloList, sloList } from '../../data/slo/slo';
import { historicalSummaryData } from '../../data/slo/historical_summary_data';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { paths } from '../../config/paths';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/slo/use_fetch_slo_list');
jest.mock('../../hooks/slo/use_create_slo');
jest.mock('../../hooks/slo/use_clone_slo');
jest.mock('../../hooks/slo/use_delete_slo');
jest.mock('../../hooks/slo/use_fetch_historical_summary');
jest.mock('../../hooks/slo/use_capabilities');

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;
const useCreateSloMock = useCreateSlo as jest.Mock;
const useCloneSloMock = useCloneSlo as jest.Mock;
const useDeleteSloMock = useDeleteSlo as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;

const mockCreateSlo = jest.fn();
const mockCloneSlo = jest.fn();

useCreateSloMock.mockReturnValue({ mutate: mockCreateSlo });
useCloneSloMock.mockReturnValue({ mutate: mockCloneSlo });

const mockDeleteSlo = jest.fn();
useDeleteSloMock.mockReturnValue({ mutate: mockDeleteSlo });

const mockNavigate = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockLocator = jest.fn();
const mockGetAddRuleFlyout = jest.fn().mockReturnValue(() => <div>Add rule flyout</div>);

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      charts: chartPluginMock.createSetupContract(),
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
      share: {
        url: {
          locators: {
            get: mockLocator,
          },
        },
      },
      triggersActionsUi: { getAddRuleFlyout: mockGetAddRuleFlyout },
      uiSettings: {
        get: (settings: string) => {
          if (settings === 'dateFormat') return 'YYYY-MM-DD';
          if (settings === 'format:percent:defaultPattern') return '0.0%';
          return '';
        },
      },
    },
  });
};

describe('SLOs Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useCapabilitiesMock.mockReturnValue({ hasWriteCapabilities: true, hasReadCapabilities: true });
  });

  describe('when the incorrect license is found', () => {
    beforeEach(() => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, sloList: emptySloList });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        sloHistoricalSummaryResponse: {},
      });
    });
    it('navigates to the SLOs Welcome Page', async () => {
      await act(async () => {
        render(<SlosPage />);
      });

      await waitFor(() => {
        expect(mockNavigate).toBeCalledWith(paths.observability.slosWelcome);
      });
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    });

    it('navigates to the SLOs Welcome Page when the API has finished loading and there are no results', async () => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, sloList: emptySloList });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        sloHistoricalSummaryResponse: {},
      });

      await act(async () => {
        render(<SlosPage />);
      });

      await waitFor(() => {
        expect(mockNavigate).toBeCalledWith(paths.observability.slosWelcome);
      });
    });

    it('should have a create new SLO button', async () => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        sloHistoricalSummaryResponse: historicalSummaryData,
      });

      await act(async () => {
        render(<SlosPage />);
      });

      expect(screen.getByText('Create new SLO')).toBeTruthy();
    });

    it('should have an Auto Refresh button', async () => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        sloHistoricalSummaryResponse: historicalSummaryData,
      });

      await act(async () => {
        render(<SlosPage />);
      });

      expect(screen.getByTestId('autoRefreshButton')).toBeTruthy();
    });

    describe('when API has returned results', () => {
      it('renders the SLO list with SLO items', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        expect(screen.queryByTestId('slosPage')).toBeTruthy();
        expect(screen.queryByTestId('sloList')).toBeTruthy();
        expect(screen.queryAllByTestId('sloItem')).toBeTruthy();
        expect(screen.queryAllByTestId('sloItem').length).toBe(sloList.results.length);
      });

      it('allows editing an SLO', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        screen.getAllByLabelText('Actions').at(0)?.click();

        await waitForEuiPopoverOpen();

        const button = screen.getByTestId('sloActionsEdit');

        expect(button).toBeTruthy();

        button.click();

        expect(mockNavigate).toBeCalledWith(
          `${paths.observability.sloEdit(sloList.results.at(0)?.id || '')}`
        );
      });

      it('allows creating a new rule for an SLO', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        screen.getAllByLabelText('Actions').at(0)?.click();

        await waitForEuiPopoverOpen();

        const button = screen.getByTestId('sloActionsCreateRule');

        expect(button).toBeTruthy();

        button.click();

        expect(mockGetAddRuleFlyout).toBeCalled();
      });

      it('allows managing rules for an SLO', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        screen.getAllByLabelText('Actions').at(0)?.click();

        await waitForEuiPopoverOpen();

        const button = screen.getByTestId('sloActionsManageRules');

        expect(button).toBeTruthy();

        button.click();

        expect(mockLocator).toBeCalled();
      });

      it('allows deleting an SLO', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        screen.getAllByLabelText('Actions').at(0)?.click();

        await waitForEuiPopoverOpen();

        const button = screen.getByTestId('sloActionsDelete');

        expect(button).toBeTruthy();

        button.click();

        screen.getByTestId('confirmModalConfirmButton').click();

        expect(mockDeleteSlo).toBeCalledWith({
          id: sloList.results.at(0)?.id,
          name: sloList.results.at(0)?.name,
        });
      });

      it('allows cloning an SLO', async () => {
        useFetchSloListMock.mockReturnValue({ isLoading: false, sloList });

        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          sloHistoricalSummaryResponse: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        screen.getAllByLabelText('Actions').at(0)?.click();

        await waitForEuiPopoverOpen();

        const button = screen.getByTestId('sloActionsClone');

        expect(button).toBeTruthy();

        button.click();

        expect(mockCloneSlo).toBeCalled();
      });
    });
  });
});
