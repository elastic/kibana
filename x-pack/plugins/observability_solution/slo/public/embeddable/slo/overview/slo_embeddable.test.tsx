/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { ReactElement } from 'react';

import { SLOEmbeddable, SloEmbeddableDeps } from './slo_embeddable';
import type { SloEmbeddableInput, OverviewMode, GroupFilters } from './types';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createObservabilityRuleTypeRegistryMock } from '@kbn/observability-plugin/public';
import { SloOverview } from './slo_overview';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';

import { ActiveAlerts } from '../../../hooks/active_alerts';
import { buildSlo } from '../../../data/slo/slo';
import { historicalSummaryData } from '../../../data/slo/historical_summary_data';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import { GroupListView } from '../../../pages/slos/components/grouped_slos/group_list_view';
import { render } from 'react-dom';
import { act } from 'react-dom/test-utils';
let mockWrapper: ReactWrapper;

jest.mock('react-dom', () => {
  const { mount } = jest.requireActual('enzyme');
  return {
    ...jest.requireActual('react-dom'),
    render: jest.fn((component: ReactElement) => {
      mockWrapper = mount(component);
    }),
  };
});

jest.mock('../../../hooks/use_fetch_slo_details');
jest.mock('../../../hooks/use_fetch_active_alerts');
jest.mock('../../../hooks/use_fetch_historical_summary');
jest.mock('../../../hooks/use_fetch_rules_for_slo');

const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;
const useFetchRulesForSloMock = useFetchRulesForSlo as jest.Mock;

function createSloEmbeddableDepsMock(): SloEmbeddableDeps {
  return {
    application: applicationServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    observability: {
      config: {
        unsafe: {
          alertDetails: {
            observability: { enabled: true },
            metrics: { enabled: false },
            uptime: { enabled: false },
          },
        },
      },
      useRulesLink: () => ({ href: 'newRuleLink' }),
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
    },
  };
}

const waitOneTick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('SLO Overview embeddable', () => {
  let mountpoint: HTMLDivElement;
  let depsMock: jest.Mocked<SloEmbeddableDeps>;
  const createEmbeddable = ({
    overviewMode,
    sloId,
    sloInstanceId,
    groupFilters,
  }: {
    overviewMode: OverviewMode;
    sloId?: string;
    sloInstanceId?: string;
    groupFilters?: GroupFilters;
  }) => {
    const baseInput: SloEmbeddableInput = {
      id: 'mock-embeddable-id',
      overviewMode,
    };
    let initialInput = baseInput;
    initialInput =
      overviewMode === 'single'
        ? {
            ...baseInput,
            sloId,
            sloInstanceId,
          }
        : {
            ...baseInput,
            groupFilters,
          };
    return new SLOEmbeddable(depsMock, initialInput);
  };
  beforeEach(() => {
    mountpoint = document.createElement('div');
    depsMock = createSloEmbeddableDepsMock() as unknown as jest.Mocked<SloEmbeddableDeps>;
  });

  afterEach(() => {
    mountpoint.remove();
    jest.restoreAllMocks();
  });

  it('should render single Overview', async () => {
    const slo = buildSlo();
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo, refetch: () => {} });
    useFetchActiveAlertsMock.mockReturnValue({ isLoading: false, data: new ActiveAlerts() });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: historicalSummaryData,
    });
    useFetchRulesForSloMock.mockReturnValue({
      isLoading: false,
      data: [],
    });
    const embeddable = createEmbeddable({
      overviewMode: 'single',
      sloId: 'sloId',
      sloInstanceId: 'sloInstanceId',
    });
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(0);
    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    expect(mockWrapper.find(SloOverview).exists()).toBe(true);
    expect(mockWrapper.find(GroupListView).exists()).toBe(false);
  });

  it('should show SLOs grouped by tags', async () => {
    await act(async () => {
      await nextTick();
      mockWrapper.unmount();
      mockWrapper.update();
    });
    const embeddable = createEmbeddable({
      overviewMode: 'groups',
      groupFilters: {
        groupBy: 'slo.tags',
        groups: ['production'],
      },
    });
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(0);

    embeddable.render(mountpoint);
    mockWrapper.update();
    expect(render).toHaveBeenCalledTimes(1);
    expect(mockWrapper.find(SloOverview).exists()).toBe(false);
  });
});
