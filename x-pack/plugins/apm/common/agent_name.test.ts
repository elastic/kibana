/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isJavaAgentName,
  isRumAgentName,
  isIosAgentName,
  isServerlessAgent,
} from './agent_name';

describe('agent name helpers', () => {
  describe('isJavaAgentName', () => {
    describe('when the agent name is java', () => {
      it('returns true', () => {
        expect(isJavaAgentName('java')).toEqual(true);
      });
    });

    describe('when the agent name is opentelemetry/java', () => {
      it('returns true', () => {
        expect(isJavaAgentName('opentelemetry/java')).toEqual(true);
      });
    });

    describe('when the agent name is not java', () => {
      it('returns false', () => {
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

    describe('when the agent name is something else', () => {
      it('returns false', () => {
        expect(isRumAgentName('not rum')).toEqual(false);
      });
    });
  });

  describe('isIosAgentName', () => {
    describe('when the agent name is js-base', () => {
      it('returns true', () => {
        expect(isIosAgentName('iOS/swift')).toEqual(true);
      });
    });

    describe('when the agent name is rum-js', () => {
      it('returns true', () => {
        expect(isIosAgentName('ios/swift')).toEqual(true);
      });
    });

    describe('when the agent name is opentelemetry/swift', () => {
      it('returns true', () => {
        expect(isIosAgentName('opentelemetry/swift')).toEqual(true);
      });
    });

    describe('when the agent name is something else', () => {
      it('returns false', () => {
        expect(isIosAgentName('not ios')).toEqual(false);
      });
    });
  });

  describe('isServerlessAgent', () => {
    describe('when the runtime name is AWS_LAMBDA', () => {
      it('returns true', () => {
        expect(isServerlessAgent('AWS_LAMBDA')).toEqual(true);
      });
    });

    describe('when the runtime name is aws_lambda', () => {
      it('returns true', () => {
        expect(isServerlessAgent('aws_lambda')).toEqual(true);
      });
    });

    describe('when the runtime name is aws_lambda_test', () => {
      it('returns true', () => {
        expect(isServerlessAgent('aws_lambda_test')).toEqual(true);
      });
    });

    describe('when the runtime name is something else', () => {
      it('returns false', () => {
        expect(isServerlessAgent('not_aws_lambda')).toEqual(false);
      });
    });
  });
});
