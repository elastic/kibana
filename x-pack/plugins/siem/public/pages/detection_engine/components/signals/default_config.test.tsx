/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { Filter } from '../../../../../../../../src/plugins/data/common/es_query';
import { TimelineAction } from '../../../../components/timeline/body/actions';
import { buildSignalsRuleIdFilter, getSignalsActions } from './default_config';
import {
  CreateTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateTimelineLoading,
} from './types';
import { mockEcsDataWithSignal } from '../../../../mock/mock_ecs';
import { sendSignalToTimelineAction, updateSignalStatusAction } from './actions';
import * as i18n from './translations';

jest.mock('./actions');

describe('signals default_config', () => {
  describe('buildSignalsRuleIdFilter', () => {
    test('given a rule id this will return an array with a single filter', () => {
      const filters: Filter[] = buildSignalsRuleIdFilter('rule-id-1');
      const expectedFilter: Filter = {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'signal.rule.id',
          params: {
            query: 'rule-id-1',
          },
        },
        query: {
          match_phrase: {
            'signal.rule.id': 'rule-id-1',
          },
        },
      };
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(expectedFilter);
    });
  });

  describe('getSignalsActions', () => {
    let setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
    let setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
    let createTimeline: CreateTimeline;
    let updateTimelineIsLoading: UpdateTimelineLoading;

    beforeEach(() => {
      setEventsLoading = jest.fn();
      setEventsDeleted = jest.fn();
      createTimeline = jest.fn();
      updateTimelineIsLoading = jest.fn();
    });

    describe('timeline tooltip', () => {
      test('it invokes sendSignalToTimelineAction when button clicked', () => {
        const signalsActions = getSignalsActions({
          canUserCRUD: true,
          hasIndexWrite: true,
          setEventsLoading,
          setEventsDeleted,
          createTimeline,
          status: 'open',
          updateTimelineIsLoading,
        });
        const timelineAction = signalsActions[0].getAction({
          eventId: 'even-id',
          ecsData: mockEcsDataWithSignal,
        });
        const wrapper = mount<React.ReactElement>(timelineAction as React.ReactElement);
        wrapper.find(EuiButtonIcon).simulate('click');

        expect(sendSignalToTimelineAction).toHaveBeenCalled();
      });
    });

    describe('signal open action', () => {
      let signalsActions: TimelineAction[];
      let signalOpenAction: JSX.Element;
      let wrapper: ReactWrapper<React.ReactElement, unknown>;

      beforeEach(() => {
        signalsActions = getSignalsActions({
          canUserCRUD: true,
          hasIndexWrite: true,
          setEventsLoading,
          setEventsDeleted,
          createTimeline,
          status: 'open',
          updateTimelineIsLoading,
        });

        signalOpenAction = signalsActions[1].getAction({
          eventId: 'event-id',
          ecsData: mockEcsDataWithSignal,
        });

        wrapper = mount<React.ReactElement>(signalOpenAction as React.ReactElement);
      });

      afterEach(() => {
        wrapper.unmount();
      });

      test('it invokes updateSignalStatusAction when button clicked', () => {
        wrapper.find(EuiButtonIcon).simulate('click');

        expect(updateSignalStatusAction).toHaveBeenCalledWith({
          signalIds: ['event-id'],
          status: 'open',
          setEventsLoading,
          setEventsDeleted,
        });
      });

      test('it displays expected text on hover', () => {
        const openSignal = wrapper.find(EuiToolTip);
        openSignal.simulate('mouseOver');
        const tooltip = wrapper.find('.euiToolTipPopover').text();

        expect(tooltip).toEqual(i18n.ACTION_OPEN_SIGNAL);
      });

      test('it displays expected icon', () => {
        const icon = wrapper.find(EuiButtonIcon).props().iconType;

        expect(icon).toEqual('securitySignalDetected');
      });
    });

    describe('signal close action', () => {
      let signalsActions: TimelineAction[];
      let signalCloseAction: JSX.Element;
      let wrapper: ReactWrapper<React.ReactElement, unknown>;

      beforeEach(() => {
        signalsActions = getSignalsActions({
          canUserCRUD: true,
          hasIndexWrite: true,
          setEventsLoading,
          setEventsDeleted,
          createTimeline,
          status: 'closed',
          updateTimelineIsLoading,
        });

        signalCloseAction = signalsActions[1].getAction({
          eventId: 'event-id',
          ecsData: mockEcsDataWithSignal,
        });

        wrapper = mount<React.ReactElement>(signalCloseAction as React.ReactElement);
      });

      afterEach(() => {
        wrapper.unmount();
      });

      test('it invokes updateSignalStatusAction when status button clicked', () => {
        wrapper.find(EuiButtonIcon).simulate('click');

        expect(updateSignalStatusAction).toHaveBeenCalledWith({
          signalIds: ['event-id'],
          status: 'closed',
          setEventsLoading,
          setEventsDeleted,
        });
      });

      test('it displays expected text on hover', () => {
        const closeSignal = wrapper.find(EuiToolTip);
        closeSignal.simulate('mouseOver');
        const tooltip = wrapper.find('.euiToolTipPopover').text();
        expect(tooltip).toEqual(i18n.ACTION_CLOSE_SIGNAL);
      });

      test('it displays expected icon', () => {
        const icon = wrapper.find(EuiButtonIcon).props().iconType;

        expect(icon).toEqual('securitySignalResolved');
      });
    });
  });
});
