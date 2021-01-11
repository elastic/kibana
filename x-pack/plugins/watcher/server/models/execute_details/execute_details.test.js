/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExecuteDetails } from './execute_details';

describe('execute_details', () => {
  describe('ExecuteDetails', () => {
    describe('fromDownstreamJson factory method', () => {
      let props;
      beforeEach(() => {
        props = {
          triggerData: 'foo1',
          ignoreCondition: 'foo2',
          alternativeInput: 'foo3',
          actionModes: 'foo4',
          recordExecution: 'foo5',
        };
      });

      it('returns correct ExecuteDetails instance', () => {
        const executeDetails = ExecuteDetails.fromDownstreamJson(props);

        expect(executeDetails.triggerData).toBe(props.triggerData);
        expect(executeDetails.ignoreCondition).toBe(props.ignoreCondition);
        expect(executeDetails.alternativeInput).toBe(props.alternativeInput);
        expect(executeDetails.actionModes).toBe(props.actionModes);
        expect(executeDetails.recordExecution).toBe(props.recordExecution);
      });
    });

    describe('upstreamJson getter method', () => {
      let props;
      beforeEach(() => {
        props = {
          triggerData: {
            triggeredTime: 'foo1',
            scheduledTime: 'foo2',
          },
          ignoreCondition: 'foo3',
          alternativeInput: 'foo4',
          actionModes: 'foo5',
          recordExecution: 'foo6',
        };
      });

      it('returns correct JSON for client', () => {
        const executeDetails = new ExecuteDetails(props);
        const actual = executeDetails.upstreamJson;
        const expected = {
          trigger_data: {
            triggered_time: executeDetails.triggerData.triggeredTime,
            scheduled_time: executeDetails.triggerData.scheduledTime,
          },
          ignore_condition: executeDetails.ignoreCondition,
          alternative_input: executeDetails.alternativeInput,
          action_modes: executeDetails.actionModes,
          record_execution: executeDetails.recordExecution,
        };

        expect(actual).toEqual(expected);
      });

      it('returns correct JSON for client with no triggeredTime', () => {
        delete props.triggerData.triggeredTime;

        const executeDetails = new ExecuteDetails(props);
        const actual = executeDetails.upstreamJson;
        const expected = {
          trigger_data: {
            scheduled_time: executeDetails.triggerData.scheduledTime,
          },
          ignore_condition: executeDetails.ignoreCondition,
          alternative_input: executeDetails.alternativeInput,
          action_modes: executeDetails.actionModes,
          record_execution: executeDetails.recordExecution,
        };

        expect(actual).toEqual(expected);
      });

      it('returns correct JSON for client with no scheduledTime', () => {
        delete props.triggerData.scheduledTime;

        const executeDetails = new ExecuteDetails(props);
        const actual = executeDetails.upstreamJson;
        const expected = {
          trigger_data: {
            triggered_time: executeDetails.triggerData.triggeredTime,
          },
          ignore_condition: executeDetails.ignoreCondition,
          alternative_input: executeDetails.alternativeInput,
          action_modes: executeDetails.actionModes,
          record_execution: executeDetails.recordExecution,
        };

        expect(actual).toEqual(expected);
      });

      it('returns correct JSON for client with no scheduledTime or triggeredTime', () => {
        delete props.triggerData.scheduledTime;
        delete props.triggerData.triggeredTime;

        const executeDetails = new ExecuteDetails(props);
        const actual = executeDetails.upstreamJson;
        const expected = {
          trigger_data: {},
          ignore_condition: executeDetails.ignoreCondition,
          alternative_input: executeDetails.alternativeInput,
          action_modes: executeDetails.actionModes,
          record_execution: executeDetails.recordExecution,
        };

        expect(actual).toEqual(expected);
      });
    });
  });
});
