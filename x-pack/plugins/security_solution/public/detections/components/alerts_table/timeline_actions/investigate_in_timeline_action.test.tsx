/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { Ecs } from '../../../../../common/ecs';
import * as actions from '../actions';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import type { SendAlertToTimelineActionProps } from '../types';
import { InvestigateInTimelineAction } from './investigate_in_timeline_action';

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
jest.mock('../actions');

const props = {
  ecsRowData,
  onInvestigateInTimelineAlertClick: () => {},
  ariaLabel: 'test',
};

describe('use investigate in timeline hook', () => {
  let mockSendAlertToTimeline: jest.SpyInstance<Promise<void>, [SendAlertToTimelineActionProps]>;

  beforeEach(() => {
    const coreStartMock = coreMock.createStart();
    (KibanaServices.get as jest.Mock).mockReturnValue(coreStartMock);
    mockSendAlertToTimeline = jest.spyOn(actions, 'sendAlertToTimelineAction');
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
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('it creates a component and click handler', () => {
    const wrapper = render(
      <TestProviders>
        <InvestigateInTimelineAction {...props} />
      </TestProviders>
    );
    expect(wrapper.getByTestId('send-alert-to-timeline-button')).toBeTruthy();
  });
  test('it calls sendAlertToTimelineAction once on click, not on mount', () => {
    const wrapper = render(
      <TestProviders>
        <InvestigateInTimelineAction {...props} />
      </TestProviders>
    );
    expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(0);
    act(() => {
      fireEvent.click(wrapper.getByTestId('send-alert-to-timeline-button'));
    });
    expect(mockSendAlertToTimeline).toHaveBeenCalledTimes(1);
  });
});
