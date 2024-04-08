/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { EventDetailsPanel } from '.';
import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { mockBrowserFields, mockRuntimeMappings } from '../../../../common/containers/source/mock';
import { coreMock } from '@kbn/core/public/mocks';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { useTimelineEventsDetails } from '../../../containers/details';
import { allCasesPermissions } from '../../../../cases_test_utils';
import {
  ASSISTANT_FEATURE_ID,
  DEFAULT_ALERTS_INDEX,
  DEFAULT_PREVIEW_INDEX,
} from '../../../../../common/constants';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';

const ecsData: Ecs = {
  _id: '1',
  agent: { type: ['blah'] },
  kibana: {
    alert: {
      workflow_status: ['open'],
      rule: {
        parameters: {},
        uuid: ['testId'],
      },
    },
  },
};

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/test', search: '?' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

jest.mock('../../../../../common/endpoint/service/host_isolation/utils', () => {
  return {
    isIsolationSupported: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('testSpace'),
}));

jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles', () => {
  return {
    useBulkGetUserProfiles: jest.fn().mockReturnValue({ isLoading: false, data: [] }),
  };
});

jest.mock('../../../../common/components/user_profiles/use_suggest_users', () => {
  return {
    useSuggestUsers: jest.fn().mockReturnValue({ isLoading: false, data: [] }),
  };
});

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({
    useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
  })
);
jest.mock('../../../../cases/components/use_insert_timeline');

jest.mock('../../../../common/utils/endpoint_alert_check', () => {
  return {
    isAlertFromEndpointAlert: jest.fn().mockReturnValue(true),
    isAlertFromEndpointEvent: jest.fn().mockReturnValue(true),
  };
});
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline',
  () => {
    return {
      useInvestigateInTimeline: jest.fn().mockReturnValue({
        investigateInTimelineActionItems: [<div />],
        investigateInTimelineAlertClick: () => {},
      }),
    };
  }
);
jest.mock('../../../../detections/components/alerts_table/actions');
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score', () => {
  return {
    useRiskScore: jest.fn().mockReturnValue({
      loading: true,
      data: undefined,
      isModuleEnabled: false,
    }),
  };
});
jest.mock('../../../../common/hooks/use_upselling');

const defaultProps = {
  scopeId: TimelineId.test,
  isHostIsolationPanelOpen: false,
  handleOnEventClosed: jest.fn(),
  onAddIsolationStatusClick: jest.fn(),
  expandedEvent: { eventId: ecsData._id, indexName: '' },
  tabType: TimelineTabs.query,
  browserFields: mockBrowserFields,
  runtimeMappings: mockRuntimeMappings,
};

jest.mock('../../../containers/details', () => {
  const actual = jest.requireActual('../../../containers/details');
  return {
    ...actual,
    useTimelineEventsDetails: jest.fn().mockImplementation(() => []),
  };
});

describe('event details panel component', () => {
  beforeEach(() => {
    const coreStartMock = coreMock.createStart();
    (KibanaServices.get as jest.Mock).mockReturnValue(coreStartMock);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ASSISTANT_FEATURE_ID]: {
              'ai-assistant': true,
            },
          },
        },
        uiSettings: {
          get: jest.fn().mockReturnValue([]),
        },
        cases: {
          ui: {
            getCasesContext: () => mockCasesContext,
          },
          cases: {
            helpers: { canUseCases: jest.fn().mockReturnValue(allCasesPermissions()) },
          },
        },
        timelines: {
          getHoverActions: jest.fn().mockReturnValue({
            getAddToTimelineButton: jest.fn(),
          }),
        },
        osquery: {
          OsqueryResult: jest.fn().mockReturnValue(null),
          fetchAllLiveQueries: jest.fn().mockReturnValue({ data: { data: { items: [] } } }),
        },
      },
    });
    (useUpsellingMessage as jest.Mock).mockReturnValue('Go for Platinum!');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the take action dropdown in the timeline version', () => {
    const wrapper = render(
      <TestProviders>
        <EventDetailsPanel {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('side-panel-flyout-footer')).toBeTruthy();
  });
  test('it renders the take action dropdown in the flyout version', () => {
    const wrapper = render(
      <TestProviders>
        <EventDetailsPanel {...defaultProps} isFlyoutView={true} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('side-panel-flyout-footer')).toBeTruthy();
  });
  test("it doesn't render the take action dropdown when readOnly prop is passed", () => {
    const wrapper = render(
      <TestProviders>
        <EventDetailsPanel {...{ ...defaultProps, isReadOnly: true }} isFlyoutView={true} />
      </TestProviders>
    );
    const element = wrapper.queryByTestId('side-panel-flyout-footer');
    expect(element).toBeNull();
  });

  describe('Alerts', () => {
    const propsWithAlertIndex = {
      ...defaultProps,
      expandedEvent: {
        eventId: ecsData._id,
        indexName: `.internal${DEFAULT_ALERTS_INDEX}-testSpace`,
      },
    };
    test('it uses the alias alerts index', () => {
      render(
        <TestProviders>
          <EventDetailsPanel {...{ ...propsWithAlertIndex }} />
        </TestProviders>
      );
      expect(useTimelineEventsDetails).toHaveBeenCalledWith({
        entityType: 'events',
        indexName: `${DEFAULT_ALERTS_INDEX}-testSpace`,
        eventId: propsWithAlertIndex.expandedEvent.eventId ?? '',
        runtimeMappings: mockRuntimeMappings,
        skip: false,
      });
    });

    test('it uses the alias alerts preview index', () => {
      const alertPreviewProps = {
        ...propsWithAlertIndex,
        expandedEvent: {
          ...propsWithAlertIndex.expandedEvent,
          indexName: `.internal${DEFAULT_PREVIEW_INDEX}-testSpace`,
        },
      };
      render(
        <TestProviders>
          <EventDetailsPanel {...{ ...alertPreviewProps }} />
        </TestProviders>
      );

      expect(useTimelineEventsDetails).toHaveBeenCalledWith({
        entityType: 'events',
        indexName: `${DEFAULT_PREVIEW_INDEX}-testSpace`,
        eventId: propsWithAlertIndex.expandedEvent.eventId,
        runtimeMappings: mockRuntimeMappings,
        skip: false,
      });
    });

    test(`it does NOT use the alerts alias when regular events happen to include a trailing '${DEFAULT_ALERTS_INDEX}' in the index name`, () => {
      const indexName = `.ds-logs-endpoint.alerts-default-2022.08.09-000001${DEFAULT_ALERTS_INDEX}`; // a regular event, that happens to include a trailing `.alerts-security.alerts`
      const propsWithEventIndex = {
        ...defaultProps,
        expandedEvent: {
          eventId: ecsData._id,
          indexName,
        },
      };

      render(
        <TestProviders>
          <EventDetailsPanel {...{ ...propsWithEventIndex }} />
        </TestProviders>
      );

      expect(useTimelineEventsDetails).toHaveBeenCalledWith({
        entityType: 'events',
        indexName, // <-- use the original index name, not the alerts alias
        eventId: propsWithEventIndex.expandedEvent.eventId,
        runtimeMappings: mockRuntimeMappings,
        skip: false,
      });
    });
  });
});
