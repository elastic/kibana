/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  IMPROVING_PRIORITY_ACTION,
  SUPPRESSED_PRIORITY_ACTION,
} from '../../../../../common/constants';
import { computeActionGroup } from './compute_action_group';
import { InstanceHistory } from '../../../../../common/types';

const STARTED_AT = new Date();
const startedAtPlus1m = moment(STARTED_AT).add(1, 'm').toDate();

describe('computeActionGroup()', () => {
  describe('degrading', () => {
    it('should return a new history event on first execution', () => {
      const history: InstanceHistory[] = [];
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;

      expect(computeActionGroup(STARTED_AT, history, instanceId, actionGroup, false)).toEqual({
        actionGroup: ALERT_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: false,
          timerange: { from: STARTED_AT.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      });
    });

    it('should return an existing history event on second execution with same actionGroup', () => {
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      ];

      expect(
        computeActionGroup(
          moment(STARTED_AT).add(1, 'm').toDate(),
          history,
          instanceId,
          actionGroup,
          false
        )
      ).toEqual({
        actionGroup: ALERT_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: false,
          timerange: { from: STARTED_AT.valueOf() },
        },
        historyRecord: history[0],
      });
    });

    it('should return an new history event on second execution with degrading actionGroup', () => {
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      ];

      expect(computeActionGroup(startedAtPlus1m, history, instanceId, actionGroup, false)).toEqual({
        actionGroup: ALERT_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: false,
          timerange: { from: startedAtPlus1m.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf(), to: startedAtPlus1m.valueOf() },
            },
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: startedAtPlus1m.valueOf() },
            },
          ],
        },
      });
    });
  });
  describe('degrading and suppressed', () => {
    it('should return a new history event on first execution that is suppressed', () => {
      const history: InstanceHistory[] = [];
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;

      expect(computeActionGroup(STARTED_AT, history, instanceId, actionGroup, true)).toEqual({
        actionGroup: SUPPRESSED_PRIORITY_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: true,
          timerange: { from: STARTED_AT.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: true,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      });
    });

    it('should return an existing history event on second execution with same actionGroup', () => {
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: true,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      ];

      expect(
        computeActionGroup(
          moment(STARTED_AT).add(1, 'm').toDate(),
          history,
          instanceId,
          actionGroup,
          true
        )
      ).toEqual({
        actionGroup: SUPPRESSED_PRIORITY_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: true,
          timerange: { from: STARTED_AT.valueOf() },
        },
        historyRecord: history[0],
      });
    });

    it('should return an new history event on second execution with degrading actionGroup', () => {
      const instanceId = 'example.com';
      const actionGroup = ALERT_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      ];

      expect(computeActionGroup(startedAtPlus1m, history, instanceId, actionGroup, true)).toEqual({
        actionGroup: SUPPRESSED_PRIORITY_ACTION.id,
        latestHistoryEvent: {
          actionGroup: ALERT_ACTION.id,
          suppressed: true,
          timerange: { from: startedAtPlus1m.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf(), to: startedAtPlus1m.valueOf() },
            },
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: true,
              timerange: { from: startedAtPlus1m.valueOf() },
            },
          ],
        },
      });
    });
  });
  describe('improving', () => {
    it('should return a new improving history event', () => {
      const instanceId = 'example.com';
      const actionGroup = HIGH_PRIORITY_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf() },
            },
          ],
        },
      ];

      expect(
        computeActionGroup(
          moment(STARTED_AT).add(1, 'm').toDate(),
          history,
          instanceId,
          actionGroup,
          false
        )
      ).toEqual({
        actionGroup: IMPROVING_PRIORITY_ACTION.id,
        latestHistoryEvent: {
          actionGroup,
          improvingFrom: ALERT_ACTION.id,
          suppressed: false,
          timerange: { from: startedAtPlus1m.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf(), to: startedAtPlus1m.valueOf() },
            },
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              improvingFrom: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: startedAtPlus1m.valueOf() },
            },
          ],
        },
      });
    });
    it('should return the latest improving history event when nothing changed', () => {
      const instanceId = 'example.com';
      const actionGroup = HIGH_PRIORITY_ACTION.id;
      const history: InstanceHistory[] = [
        {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf(), to: startedAtPlus1m.valueOf() },
            },
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              improvingFrom: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: startedAtPlus1m.valueOf() },
            },
          ],
        },
      ];

      expect(
        computeActionGroup(
          moment(STARTED_AT).add(2, 'm').toDate(),
          history,
          instanceId,
          actionGroup,
          false
        )
      ).toEqual({
        actionGroup: IMPROVING_PRIORITY_ACTION.id,
        latestHistoryEvent: {
          actionGroup,
          improvingFrom: ALERT_ACTION.id,
          suppressed: false,
          timerange: { from: startedAtPlus1m.valueOf() },
        },
        historyRecord: {
          instanceId,
          history: [
            {
              actionGroup: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: STARTED_AT.valueOf(), to: startedAtPlus1m.valueOf() },
            },
            {
              actionGroup: HIGH_PRIORITY_ACTION.id,
              improvingFrom: ALERT_ACTION.id,
              suppressed: false,
              timerange: { from: startedAtPlus1m.valueOf() },
            },
          ],
        },
      });
    });
  });
});
