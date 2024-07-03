/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutFooter } from './footer';
import { TestProviders } from '../../../../../common/mock';
import { TimelineId } from '../../../../../../common/types/timeline';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockAlertDetailsData } from '../../../../../common/components/event_details/__mocks__';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import { KibanaServices, useKibana } from '../../../../../common/lib/kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

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

jest.mock('../../../../../common/components/endpoint/host_isolation');
jest.mock('../../../../../common/components/endpoint/responder');

jest.mock(
  '../../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_status',
  () => {
    return {
      useEndpointHostIsolationStatus: jest.fn().mockReturnValue({
        loading: false,
        isIsolated: false,
        agentStatus: 'healthy',
      }),
    };
  }
);

jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));

jest.mock('../../../../../common/lib/kibana');

jest.mock(
  '../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({
    useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
  })
);
jest.mock('../../../../../cases/components/use_insert_timeline');

jest.mock(
  '../../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline',
  () => {
    return {
      useInvestigateInTimeline: jest.fn().mockReturnValue({
        investigateInTimelineActionItems: [<div />],
        investigateInTimelineAlertClick: () => {},
      }),
    };
  }
);
jest.mock('../../../../../detections/components/alerts_table/actions');
jest.mock('../../../../../common/components/guided_onboarding_tour/tour_step');

const defaultProps = {
  scopeId: TimelineId.test,
  loadingEventDetails: false,
  detailsEcsData: ecsData,
  isHostIsolationPanelOpen: false,
  handleOnEventClosed: jest.fn(),
  onAddIsolationStatusClick: jest.fn(),
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
        application: {
          ...coreStartMock.application,
          capabilities: {
            ...coreStartMock.application.capabilities,
            siem: {
              crudEndpointExceptions: true,
            },
          },
        },
      },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('it renders the take action dropdown', () => {
    const wrapper = render(
      <TestProviders>
        <FlyoutFooter {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('take-action-dropdown-btn')).toBeTruthy();
  });
});
