/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getActionType } from '../get_action_type';
import { ACTION_TYPES } from '../../../../common/constants';

describe('get_action_type', () => {

  describe('getActionType', () => {

    it(`correctly calculates ACTION_TYPES.EMAIL`, () => {
      const actionJson = {
        email: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.EMAIL);
    });

    it(`correctly calculates ACTION_TYPES.WEBHOOK`, () => {
      const actionJson = {
        webhook: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.WEBHOOK);
    });

    it(`correctly calculates ACTION_TYPES.INDEX`, () => {
      const actionJson = {
        index: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.INDEX);
    });

    it(`correctly calculates ACTION_TYPES.LOGGING`, () => {
      const actionJson = {
        logging: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.LOGGING);
    });

    it(`correctly calculates ACTION_TYPES.HIPCHAT`, () => {
      const actionJson = {
        hipchat: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.HIPCHAT);
    });

    it(`correctly calculates ACTION_TYPES.SLACK`, () => {
      const actionJson = {
        slack: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.SLACK);
    });

    it(`correctly calculates ACTION_TYPES.PAGERDUTY`, () => {
      const actionJson = {
        pagerduty: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.PAGERDUTY);
    });

    it(`correctly calculates ACTION_TYPES.UNKNOWN`, () => {
      const actionJson = {
        this_is_not_a_valid_action_type: {
          'foo': 'bar'
        }
      };
      const type = getActionType(actionJson);

      expect(type).to.be(ACTION_TYPES.UNKNOWN);
    });

  });

});
