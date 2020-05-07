/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ExecuteDetails } from '../execute_details';

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

        expect(executeDetails.triggerData).to.be(props.triggerData);
        expect(executeDetails.ignoreCondition).to.be(props.ignoreCondition);
        expect(executeDetails.alternativeInput).to.be(props.alternativeInput);
        expect(executeDetails.actionModes).to.be(props.actionModes);
        expect(executeDetails.recordExecution).to.be(props.recordExecution);
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

        expect(actual).to.eql(expected);
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

        expect(actual).to.eql(expected);
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

        expect(actual).to.eql(expected);
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

        expect(actual).to.eql(expected);
      });
    });
  });
});
