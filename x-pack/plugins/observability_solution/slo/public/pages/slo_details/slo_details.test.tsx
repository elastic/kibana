/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { Capabilities } from '@kbn/core/public';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { encode } from '@kbn/rison';
import { ALL_VALUE } from '@kbn/slo-schema';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Router from 'react-router-dom';
import { paths } from '../../../common/locators/paths';
import {
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
} from '../../data/slo/historical_summary_data';
import { buildApmAvailabilityIndicator } from '../../data/slo/indicator';
import { buildSlo } from '../../data/slo/slo';
import { ActiveAlerts } from '../../hooks/active_alerts';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useDeleteSlo } from '../../hooks/use_delete_slo';
import { useDeleteSloInstance } from '../../hooks/use_delete_slo_instance';
import { useFetchActiveAlerts } from '../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../hooks/use_fetch_historical_summary';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useLicense } from '../../hooks/use_license';
import { useKibana } from '../../utils/kibana_react';
import { render } from '../../utils/test_helper';
import { SloDetailsPage } from './slo_details';
import { TagsList, HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../utils/kibana_react');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_capabilities');
jest.mock('../../hooks/use_fetch_active_alerts');
jest.mock('../../hooks/use_fetch_slo_details');
jest.mock('../../hooks/use_fetch_historical_summary');
jest.mock('../../hooks/use_delete_slo');
jest.mock('../../hooks/use_delete_slo_instance');

const useKibanaMock = useKibana as jest.Mock;

const useLicenseMock = useLicense as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;
const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;
const useDeleteSloMock = useDeleteSlo as jest.Mock;
const useDeleteSloInstanceMock = useDeleteSloInstance as jest.Mock;
const TagsListMock = TagsList as jest.Mock;
TagsListMock.mockReturnValue(<div>Tags list</div>);

const HeaderMenuPortalMock = HeaderMenuPortal as jest.Mock;
HeaderMenuPortalMock.mockReturnValue(<div>Portal node</div>);

const mockNavigate = jest.fn();
const mockLocator = jest.fn();
const mockDelete = jest.fn();
const mockDeleteInstance = jest.fn();
const mockCapabilities = {
  apm: { show: true },
} as unknown as Capabilities;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      theme: {},
      lens: {
        EmbeddableComponent: () => <div data-test-subj="errorRateChart">mocked component</div>,
      },
      application: { navigateToUrl: mockNavigate, capabilities: mockCapabilities },
      charts: chartPluginMock.createStartContract(),
      http: {
        basePath: {
          prepend: (url: string) => url,
          get: () => 'http://localhost:5601',
        },
      },
      dataViews: {
        create: jest.fn().mockResolvedValue({
          getIndexPattern: jest.fn().mockReturnValue('some-index'),
        }),
      },
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
          addError: jest.fn(),
        },
      },
      observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
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
      executionContext: {
        get: () => ({
          name: 'slo',
        }),
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
      data: historicalSummaryData,
    });
    useFetchActiveAlertsMock.mockReturnValue({ isLoading: false, data: new ActiveAlerts() });
    useDeleteSloMock.mockReturnValue({ mutateAsync: mockDelete });
    useDeleteSloInstanceMock.mockReturnValue({ mutateAsync: mockDeleteInstance });
    jest
      .spyOn(Router, 'useLocation')
      .mockReturnValue({ pathname: '/slos/1234', search: '', state: '', hash: '' });
  });

  describe('when the incorrect license is found', () => {
    it('navigates to the SLO List page', async () => {
      const slo = buildSlo();
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });

      render(<SloDetailsPage />);

      expect(mockNavigate).toBeCalledWith(paths.slos);
    });
  });

  it('renders the PageNotFound when the SLO cannot be found', async () => {
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: 'nonexistent' });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the loading spinner when fetching the SLO', async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: true, data: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeFalsy();
    expect(screen.queryByTestId('loadingTitle')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsLoading')).toBeTruthy();
  });

  it('renders the SLO details page with loading charts when summary data is loading', async () => {
    const slo = buildSlo({ id: HEALTHY_STEP_DOWN_ROLLING_SLO });
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: true,
      data: [],
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
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('overview')).toBeTruthy();
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorRateChart')).toBeTruthy();
    expect(screen.queryAllByTestId('wideChartLoading').length).toBe(0);
  });

  it("renders a 'Edit' button under actions menu", async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverEdit')).toBeTruthy();
  });

  it("renders a 'Create alert rule' button under actions menu", async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverCreateRule')).toBeTruthy();
  });

  it("renders a 'Manage rules' button under actions menu", async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverManageRules')).toBeTruthy();
  });

  it("renders a 'Clone' button under actions menu", async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

    const button = screen.queryByTestId('sloDetailsHeaderControlPopoverClone');

    expect(button).toBeTruthy();

    fireEvent.click(button!);

    await waitFor(() => {
      expect(mockNavigate).toBeCalledWith(
        paths.sloCreateWithEncodedForm(
          encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })
        )
      );
    });
  });

  it("renders a 'Delete' button under actions menu", async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

    const button = screen.queryByTestId('sloDetailsHeaderControlPopoverDelete');

    expect(button).toBeTruthy();

    fireEvent.click(button!);

    const deleteModalConfirmButton = screen.queryByTestId(
      'observabilitySolutionSloDeleteModalConfirmButton'
    );

    fireEvent.click(deleteModalConfirmButton!);

    expect(mockDelete).toBeCalledWith({
      id: slo.id,
      name: slo.name,
    });

    await waitFor(() => {
      expect(mockNavigate).toBeCalledWith(paths.slos);
    });
  });

  it('renders the Overview tab by default', async () => {
    const slo = buildSlo();
    jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchActiveAlertsMock.mockReturnValue({
      isLoading: false,
      data: new ActiveAlerts({ [`${slo.id}|${ALL_VALUE}`]: 2 }),
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
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeTruthy();
    });
  });

  describe('when an Custom Query SLO is loaded', () => {
    it("does not render a 'Explore in APM' button under actions menu", async () => {
      const slo = buildSlo();
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeFalsy();
    });
  });
});
