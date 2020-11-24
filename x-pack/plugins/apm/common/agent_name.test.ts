/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getFirstTransactionType,
  isJavaAgentName,
  isRumAgentName,
} from './agent_name';

describe('agent name helpers', () => {
  describe('getFirstTransactionType', () => {
    describe('with no transaction types', () => {
      expect(getFirstTransactionType([])).toBeUndefined();
    });

    describe('with a non-rum agent', () => {
      it('returns "request"', () => {
        expect(getFirstTransactionType(['worker', 'request'], 'java')).toEqual(
          'request'
        );
      });

      describe('with no request types', () => {
        it('returns the first type', () => {
          expect(
            getFirstTransactionType(['worker', 'shirker'], 'java')
          ).toEqual('worker');
        });
      });
    });

    describe('with a rum agent', () => {
      it('returns "page-load"', () => {
        expect(
          getFirstTransactionType(['http-request', 'page-load'], 'js-base')
        ).toEqual('page-load');
      });
    });
  });

  describe('isJavaAgentName', () => {
    describe('when the agent name is java', () => {
      it('returns true', () => {
        expect(isJavaAgentName('java')).toEqual(true);
      });
    });
    describe('when the agent name is not java', () => {
      it('returns true', () => {
        expect(isJavaAgentName('not java')).toEqual(false);
      });
    });
  });

  describe('isRumAgentName', () => {
    describe('when the agent name is js-base', () => {
      it('returns true', () => {
        expect(isRumAgentName('js-base')).toEqual(true);
      });
    });

    describe('when the agent name is rum-js', () => {
      it('returns true', () => {
        expect(isRumAgentName('rum-js')).toEqual(true);
      });
    });

    describe('when the agent name is opentelemetry/webjs', () => {
      it('returns true', () => {
        expect(isRumAgentName('opentelemetry/webjs')).toEqual(true);
      });
    });

    describe('when the agent name something else', () => {
      it('returns true', () => {
        expect(isRumAgentName('java')).toEqual(false);
      });
    });
  });
});
