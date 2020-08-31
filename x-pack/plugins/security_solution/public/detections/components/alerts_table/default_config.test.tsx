/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import { buildAlertsRuleIdFilter } from './default_config';

jest.mock('./actions');

describe('alerts default_config', () => {
  describe('buildAlertsRuleIdFilter', () => {
    test('given a rule id this will return an array with a single filter', () => {
      const filters: Filter[] = buildAlertsRuleIdFilter('rule-id-1');
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
  // TODO: move these tests to ../timelines/components/timeline/body/events/event_column_view.tsx
  // describe.skip('getAlertActions', () => {
  //   let setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  //   let setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  //   let createTimeline: CreateTimeline;
  //   let updateTimelineIsLoading: UpdateTimelineLoading;
  //
  //   let onAlertStatusUpdateSuccess: (count: number, status: string) => void;
  //   let onAlertStatusUpdateFailure: (status: string, error: Error) => void;
  //
  //   beforeEach(() => {
  //     setEventsLoading = jest.fn();
  //     setEventsDeleted = jest.fn();
  //     createTimeline = jest.fn();
  //     updateTimelineIsLoading = jest.fn();
  //     onAlertStatusUpdateSuccess = jest.fn();
  //     onAlertStatusUpdateFailure = jest.fn();
  //   });
  //
  //   describe('timeline tooltip', () => {
  //     test('it invokes sendAlertToTimelineAction when button clicked', () => {
  //       const alertsActions = getAlertActions({
  //         canUserCRUD: true,
  //         hasIndexWrite: true,
  //         setEventsLoading,
  //         setEventsDeleted,
  //         createTimeline,
  //         status: 'open',
  //         updateTimelineIsLoading,
  //         onAlertStatusUpdateSuccess,
  //         onAlertStatusUpdateFailure,
  //       });
  //       const timelineAction = alertsActions[0].getAction({
  //         eventId: 'even-id',
  //         ecsData: mockEcsDataWithAlert,
  //       });
  //       const wrapper = mount<React.ReactElement>(timelineAction as React.ReactElement);
  //       wrapper.find(EuiButtonIcon).simulate('click');
  //
  //       expect(sendAlertToTimelineAction).toHaveBeenCalled();
  //     });
  //   });
  //
  //   describe('alert open action', () => {
  //     let alertsActions: TimelineAction[];
  //     let alertOpenAction: JSX.Element;
  //     let wrapper: ReactWrapper<React.ReactElement, unknown>;
  //
  //     beforeEach(() => {
  //       alertsActions = getAlertActions({
  //         canUserCRUD: true,
  //         hasIndexWrite: true,
  //         setEventsLoading,
  //         setEventsDeleted,
  //         createTimeline,
  //         status: 'open',
  //         updateTimelineIsLoading,
  //         onAlertStatusUpdateSuccess,
  //         onAlertStatusUpdateFailure,
  //       });
  //
  //       alertOpenAction = alertsActions[1].getAction({
  //         eventId: 'event-id',
  //         ecsData: mockEcsDataWithAlert,
  //       });
  //
  //       wrapper = mount<React.ReactElement>(alertOpenAction as React.ReactElement);
  //     });
  //
  //     afterEach(() => {
  //       wrapper.unmount();
  //     });
  //
  //     test('it invokes updateAlertStatusAction when button clicked', () => {
  //       wrapper.find(EuiButtonIcon).simulate('click');
  //
  //       expect(updateAlertStatusAction).toHaveBeenCalledWith({
  //         alertIds: ['event-id'],
  //         status: 'open',
  //         setEventsLoading,
  //         setEventsDeleted,
  //         onAlertStatusUpdateSuccess,
  //         onAlertStatusUpdateFailure,
  //       });
  //     });
  //
  //     test('it displays expected text on hover', () => {
  //       const openAlert = wrapper.find(EuiToolTip);
  //       openAlert.simulate('mouseOver');
  //       const tooltip = wrapper.find('.euiToolTipPopover').text();
  //
  //       expect(tooltip).toEqual(i18n.ACTION_OPEN_ALERT);
  //     });
  //
  //     test('it displays expected icon', () => {
  //       const icon = wrapper.find(EuiButtonIcon).props().iconType;
  //
  //       expect(icon).toEqual('securityAlertDetected');
  //     });
  //   });
  //
  //   describe('alert close action', () => {
  //     let alertsActions: TimelineAction[];
  //     let alertCloseAction: JSX.Element;
  //     let wrapper: ReactWrapper<React.ReactElement, unknown>;
  //
  //     beforeEach(() => {
  //       alertsActions = getAlertActions({
  //         canUserCRUD: true,
  //         hasIndexWrite: true,
  //         setEventsLoading,
  //         setEventsDeleted,
  //         createTimeline,
  //         status: 'closed',
  //         updateTimelineIsLoading,
  //         onAlertStatusUpdateSuccess,
  //         onAlertStatusUpdateFailure,
  //       });
  //
  //       alertCloseAction = alertsActions[1].getAction({
  //         eventId: 'event-id',
  //         ecsData: mockEcsDataWithAlert,
  //       });
  //
  //       wrapper = mount<React.ReactElement>(alertCloseAction as React.ReactElement);
  //     });
  //
  //     afterEach(() => {
  //       wrapper.unmount();
  //     });
  //
  //     test('it invokes updateAlertStatusAction when status button clicked', () => {
  //       wrapper.find(EuiButtonIcon).simulate('click');
  //
  //       expect(updateAlertStatusAction).toHaveBeenCalledWith({
  //         alertIds: ['event-id'],
  //         status: 'closed',
  //         setEventsLoading,
  //         setEventsDeleted,
  //         onAlertStatusUpdateSuccess,
  //         onAlertStatusUpdateFailure,
  //       });
  //     });
  //
  //     test('it displays expected text on hover', () => {
  //       const closeAlert = wrapper.find(EuiToolTip);
  //       closeAlert.simulate('mouseOver');
  //       const tooltip = wrapper.find('.euiToolTipPopover').text();
  //       expect(tooltip).toEqual(i18n.ACTION_CLOSE_ALERT);
  //     });
  //
  //     test('it displays expected icon', () => {
  //       const icon = wrapper.find(EuiButtonIcon).props().iconType;
  //
  //       expect(icon).toEqual('securityAlertResolved');
  //     });
  //   });
  // });
});
