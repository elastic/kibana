/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GrokdebuggerResponse } from './grokdebugger_response';

describe('grokdebugger_response', () => {
  describe('GrokdebuggerResponse', () => {
    describe('fromUpstreamJSON factory method', () => {
      it('returns correct GrokdebuggerResponse instance when there are no grok parse errors', () => {
        const upstreamJson = {
          docs: [
            {
              doc: {
                _index: 'grokdebugger',
                _id: 'grokdebugger',
                _source: {
                  request: '/index.html',
                  rawEvent: '55.3.244.1 GET /index.html',
                  method: 'GET',
                  client: '55.3.244.1',
                },
                _ingest: {
                  timestamp: '2017-05-13T23:29:14.809Z',
                },
              },
            },
          ],
        };
        // factory method should have removed rawEvent field
        const expectedStructuredEvent = {
          request: '/index.html',
          method: 'GET',
          client: '55.3.244.1',
        };
        const grokdebuggerResponse = GrokdebuggerResponse.fromUpstreamJSON(upstreamJson);
        expect(grokdebuggerResponse.structuredEvent).toEqual(expectedStructuredEvent);
        expect(grokdebuggerResponse.error).toEqual({});
      });

      it('returns correct GrokdebuggerResponse instance when there are valid grok parse errors', () => {
        const upstreamJson = {
          docs: [
            {
              error: {
                root_cause: [
                  {
                    type: 'exception',
                    reason: 'java.lang.IllegalArgumentException',
                    header: {
                      processor_type: 'grok',
                    },
                  },
                ],
                type: 'exception',
              },
            },
          ],
        };
        const grokdebuggerResponse = GrokdebuggerResponse.fromUpstreamJSON(upstreamJson);
        expect(grokdebuggerResponse.structuredEvent).toEqual({});
        expect(grokdebuggerResponse.error).toBe(
          'Provided Grok patterns do not match data in the input'
        );
      });
    });
  });
});
