/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExistsFilter, Filter } from '@kbn/es-query';
import {
  buildAlertsFilter,
  buildAlertStatusesFilter,
  buildAlertStatusFilter,
  buildThreatMatchFilter,
} from './default_config';

jest.mock('./actions');

describe('alerts default_config', () => {
  describe('buildAlertsRuleIdFilter', () => {
    test('given a rule id this will return an array with a single filter', () => {
      const filters: Filter[] = buildAlertsFilter('rule-id-1');
      const expectedFilter: Filter = {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'kibana.alert.rule.rule_id',
          params: {
            query: 'rule-id-1',
          },
        },
        query: {
          match_phrase: {
            'kibana.alert.rule.rule_id': 'rule-id-1',
          },
        },
      };
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(expectedFilter);
    });

    describe('buildThreatMatchFilter', () => {
      test('given a showOnlyThreatIndicatorAlerts=true this will return an array with a single filter', () => {
        const filters: Filter[] = buildThreatMatchFilter(true);
        const expectedFilter: ExistsFilter = {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
            key: 'kibana.alert.rule.type',
            type: 'term',
          },
          query: { term: { 'kibana.alert.rule.type': 'threat_match' } },
        };
        expect(filters).toHaveLength(1);
        expect(filters[0]).toEqual(expectedFilter);
      });
      test('given a showOnlyThreatIndicatorAlerts=false this will return an empty filter', () => {
        const filters: Filter[] = buildThreatMatchFilter(false);
        expect(filters).toHaveLength(0);
      });
    });
  });

  describe('buildAlertStatusFilter', () => {
    test('when status is acknowledged, filter will build for both `in-progress` and `acknowledged`', () => {
      const filters = buildAlertStatusFilter('acknowledged');
      const expected = {
        meta: {
          alias: null,
          disabled: false,
          key: 'kibana.alert.workflow_status',
          negate: false,
          params: {
            query: 'acknowledged',
          },
          type: 'phrase',
        },
        query: {
          bool: {
            should: [
              {
                term: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
              {
                term: {
                  'kibana.alert.workflow_status': 'in-progress',
                },
              },
            ],
          },
        },
      };
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(expected);
    });

    test('when status is `open` or `closed`, filter will build for solely that status', () => {
      const filters = buildAlertStatusFilter('open');
      const expected = {
        meta: {
          alias: null,
          disabled: false,
          key: 'kibana.alert.workflow_status',
          negate: false,
          params: {
            query: 'open',
          },
          type: 'phrase',
        },
        query: {
          term: {
            'kibana.alert.workflow_status': 'open',
          },
        },
      };
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(expected);
    });
  });

  describe('buildAlertStatusesFilter', () => {
    test('builds filter containing all statuses passed into function', () => {
      const filters = buildAlertStatusesFilter(['open', 'acknowledged', 'in-progress']);
      const expected = {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
        },
        query: {
          bool: {
            should: [
              {
                term: {
                  'kibana.alert.workflow_status': 'open',
                },
              },
              {
                term: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
              {
                term: {
                  'kibana.alert.workflow_status': 'in-progress',
                },
              },
            ],
          },
        },
      };
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(expected);
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
