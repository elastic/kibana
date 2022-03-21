/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { EventDetailsFooter } from './footer';
import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { Ecs } from '../../../../../common/ecs';
import { mockAlertDetailsData } from '../../../../common/components/event_details/__mocks__';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { mockCasesContract } from '../../../../../../cases/public/mocks';

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

const mockAlertDetailsDataWithIsObject = mockAlertDetailsData.map((detail) => {
  return {
    ...detail,
    isObjectArray: false,
  };
}) as TimelineEventsDetailsItem[];

jest.mock('../../../../../common/endpoint/service/host_isolation/utils', () => {
  return {
    isIsolationSupported: jest.fn().mockReturnValue(true),
  };
});

jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_host_isolation_status',
  () => {
    return {
      useHostIsolationStatus: jest.fn().mockReturnValue({
        loading: false,
        isIsolated: false,
        agentStatus: 'healthy',
      }),
    };
  }
);

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

const defaultProps = {
  timelineId: TimelineId.test,
  loadingEventDetails: false,
  detailsEcsData: ecsData,
  isHostIsolationPanelOpen: false,
  handleOnEventClosed: jest.fn(),
  onAddIsolationStatusClick: jest.fn(),
  expandedEvent: { eventId: ecsData._id, indexName: '' },
  detailsData: mockAlertDetailsDataWithIsObject,
  refetchFlyoutData: jest.fn(),
};

describe('event details footer component', () => {
  beforeEach(() => {
    const coreStartMock = coreMock.createStart();
    (KibanaServices.get as jest.Mock).mockReturnValue(coreStartMock);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          search: {
            searchStrategyClient: jest.fn(),
          },
          query: jest.fn(),
        },
        cases: mockCasesContract(),
      },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('it renders the take action dropdown', () => {
    const wrapper = render(
      <TestProviders>
        <EventDetailsFooter {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('take-action-dropdown-btn')).toBeTruthy();
  });
});
