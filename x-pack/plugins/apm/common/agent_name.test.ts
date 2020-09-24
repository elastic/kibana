/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNormalizedAgentName } from './agent_name';

describe('agent name helpers', () => {
  describe('getNormalizedAgentName', () => {
    describe('with an already normalized name', () => {
      it('returns the original', () => {
        expect(getNormalizedAgentName('nodejs')).toEqual('nodejs');
      });
    });

    describe('with rum-js', () => {
      it('converts it to js-base', () => {
        expect(getNormalizedAgentName('rum-js')).toEqual('js-base');
      });
    });

    describe('with an OpenTelemetry agent name', () => {
      it('converts it to the normal agent name', () => {
        expect(getNormalizedAgentName('opentelemetry/nodejs')).toEqual(
          'nodejs'
        );
      });

      describe('with opentelemetry/webjs', () => {
        it('converts it to js-base', () => {
          expect(getNormalizedAgentName('opentelemetry/webjs')).toEqual(
            'js-base'
          );
        });
      });

      describe('with otlp', () => {
        it('converts it to python', () => {
          expect(getNormalizedAgentName('otlp')).toEqual('python');
        });
      });
    });
  });
});
