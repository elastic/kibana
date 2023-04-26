/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { useKibana } from '../../utils/kibana_react';
import { useParams } from 'react-router-dom';
import { useLicense } from '../../hooks/use_license';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { render } from '../../utils/test_helper';
import { SloDetailsPage } from './slo_details';
import { buildSlo } from '../../data/slo/slo';
import { paths } from '../../config/paths';
import { useFetchHistoricalSummary } from '../../hooks/slo/use_fetch_historical_summary';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { useFetchActiveAlerts } from '../../hooks/slo/use_fetch_active_alerts';
import {
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
} from '../../data/slo/historical_summary_data';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { buildApmAvailabilityIndicator } from '../../data/slo/indicator';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/slo/use_fetch_active_alerts');
jest.mock('../../hooks/slo/use_fetch_slo_details');
jest.mock('../../hooks/slo/use_fetch_historical_summary');
jest.mock('../../hooks/slo/use_capabilities');

const useKibanaMock = useKibana as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;
const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;

const mockNavigate = jest.fn();
const mockBasePathPrepend = jest.fn();
const mockLocator = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      charts: chartPluginMock.createStartContract(),
      http: {
        basePath: {
          prepend: mockBasePathPrepend,
        },
      },
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
      share: {
        url: {
          locators: {
            get: mockLocator,
          },
        },
      },
      triggersActionsUi: {
        getAddRuleFlyout: jest.fn(() => (
          <div data-test-subj="add-rule-flyout">mocked component</div>
        )),
      },
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

describe('SLO Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    useCapabilitiesMock.mockReturnValue({ hasWriteCapabilities: true, hasReadCapabilities: true });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      sloHistoricalSummaryResponse: historicalSummaryData,
    });
    useFetchActiveAlertsMock.mockReturnValue({ isLoading: false, data: {} });
  });

  describe('when the incorrect license is found', () => {
    it('navigates to the SLO List page', async () => {
      const slo = buildSlo();
      useParamsMock.mockReturnValue(slo.id);
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });

      render(<SloDetailsPage />);

      expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
    });
  });

  it('renders the PageNotFound when the SLO cannot be found', async () => {
    useParamsMock.mockReturnValue('nonexistent');
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the loading spinner when fetching the SLO', async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: true, slo: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeFalsy();
    expect(screen.queryByTestId('loadingTitle')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsLoading')).toBeTruthy();
  });

  it('renders the SLO details page with loading charts when summary data is loading', async () => {
    const slo = buildSlo({ id: HEALTHY_STEP_DOWN_ROLLING_SLO });
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: true,
      sloHistoricalSummaryResponse: {},
    });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('overview')).toBeTruthy();
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
    expect(screen.queryAllByTestId('wideChartLoading').length).toBe(2);
  });

  it('renders the SLO details page with the overview and chart panels', async () => {
    const slo = buildSlo({ id: HEALTHY_STEP_DOWN_ROLLING_SLO });
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('overview')).toBeTruthy();
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
    expect(screen.queryAllByTestId('wideChartLoading').length).toBe(0);
  });

  it("renders a 'Edit' button under actions menu", async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverEdit')).toBeTruthy();
  });

  it("renders a 'Create alert rule' button under actions menu", async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverCreateRule')).toBeTruthy();
  });

  it("renders a 'Manage rules' button under actions menu", async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverManageRules')).toBeTruthy();
  });

  it("renders a 'Clone' button under actions menu", async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverClone')).toBeTruthy();
  });

  it("renders a 'Delete' button under actions menu", async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverDelete')).toBeTruthy();

    const manageRulesButton = screen.queryByTestId('sloDetailsHeaderControlPopoverManageRules');
    expect(manageRulesButton).toBeTruthy();

    fireEvent.click(manageRulesButton!);

    expect(mockLocator).toBeCalled();
  });

  it('renders the Overview tab by default', async () => {
    const slo = buildSlo();
    useParamsMock.mockReturnValue(slo.id);
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchActiveAlertsMock.mockReturnValue({
      isLoading: false,
      data: { [slo.id]: { count: 2, ruleIds: ['rule-1', 'rule-2'] } },
    });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('overviewTab')).toBeTruthy();
    expect(screen.queryByTestId('overviewTab')?.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByTestId('alertsTab')).toBeTruthy();
    expect(screen.queryByTestId('alertsTab')?.getAttribute('aria-selected')).toBe('false');
  });

  describe('when an APM SLO is loaded', () => {
    it("renders a 'Explore in APM' button under actions menu", async () => {
      const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
      useParamsMock.mockReturnValue(slo.id);
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeTruthy();
    });
  });

  describe('when an Custom KQL SLO is loaded', () => {
    it("does not render a 'Explore in APM' button under actions menu", async () => {
      const slo = buildSlo();
      useParamsMock.mockReturnValue(slo.id);
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeFalsy();
    });
  });
});
