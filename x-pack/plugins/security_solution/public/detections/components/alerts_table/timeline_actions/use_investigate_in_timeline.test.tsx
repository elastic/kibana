/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useInvestigateInTimeline } from './use_investigate_in_timeline';
import * as actions from '../actions';
import { coreMock } from '@kbn/core/public/mocks';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

const ecsRowData: Ecs = {
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

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/lib/apm/use_start_transaction');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../actions');

(KibanaServices.get as jest.Mock).mockReturnValue(coreMock.createStart());
const mockSendAlertToTimeline = jest.spyOn(actions, 'sendAlertToTimelineAction');
(useKibana as jest.Mock).mockReturnValue({
  services: {
    data: {
      search: {
        searchStrategyClient: jest.fn(),
      },
      query: jest.fn(),
    },
  },
});
(useAppToasts as jest.Mock).mockReturnValue({
  addError: jest.fn(),
});

const props = {
  ecsRowData,
  onInvestigateInTimelineAlertClick: () => {},
};

describe('use investigate in timeline hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('it creates a component and click handler', () => {
    const { result } = renderHook(() => useInvestigateInTimeline(props), {
      wrapper: TestProviders,
    });
    expect(result.current.investigateInTimelineActionItems).toBeTruthy();
    expect(typeof result.current.investigateInTimelineAlertClick).toBe('function');
  });

  describe('the click handler calls createTimeline once and only once', () => {
    test('runs 0 times on render, once on click', async () => {
      const { result } = renderHook(() => useInvestigateInTimeline(props), {
        wrapper: TestProviders,
      });
      const component = result.current.investigateInTimelineActionItems[0];
      const { getByTestId } = render(component);
      expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(0);
      act(() => {
        fireEvent.click(getByTestId('investigate-in-timeline-action-item'));
      });
      expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(1);
    });
  });
});
