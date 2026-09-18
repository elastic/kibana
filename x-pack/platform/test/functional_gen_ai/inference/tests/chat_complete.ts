/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, toArray } from 'rxjs';
import expect from '@kbn/expect';
import { supertestToObservable } from '@kbn/sse-utils-server';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type SuperTest from 'supertest';
import type { FtrProviderContext } from '../ftr_provider_context';
import { createJudgedIt } from './llm_triage';

const MAX_EVENTS_MESSAGE_CHARS = 2_000;

const describeEvents = (events: unknown[]): string => {
  const serialized = JSON.stringify(events);
  return serialized.length > MAX_EVENTS_MESSAGE_CHARS
    ? `${serialized.slice(0, MAX_EVENTS_MESSAGE_CHARS)}…[truncated]`
    : serialized;
};

/**
 * Collects all SSE events from a chat_complete stream and fails with the full error
 * payload when the stream reports an error, so failure triage sees the provider
 * error details instead of a bare assertion message.
 */
const readStreamEvents = async (response: SuperTest.Test) => {
  const events = await lastValueFrom(supertestToObservable(response).pipe(toArray()));
  const errorEvent = events.find((event) => event?.type === 'error');
  if (errorEvent) {
    throw new Error(`chat_complete stream emitted an error event: ${JSON.stringify(errorEvent)}`);
  }
  return events;
};

export const chatCompleteSuite = (
  { id: connectorId, actionTypeId: connectorType }: AvailableConnectorWithId,
  providerContext: FtrProviderContext
) => {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const judgedIt = createJudgedIt(providerContext, connectorId);

  describe('chatComplete API', () => {
    describe('streaming disabled', () => {
      judgedIt('returns a chat completion message for a simple prompt', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            temperature: 0.1,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const message = response.body;

        expect(message.toolCalls.length).to.eql(0);
        expect(message.content).to.contain('4');
      });

      judgedIt('executes a tool with native function calling', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system:
              'Please answer the user question. You can use the available tools if you think it can help',
            messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
            toolChoice: 'required',
            tools: {
              calculator: {
                description: 'The calculator can be used to resolve mathematical calculations',
                schema: {
                  type: 'object',
                  properties: {
                    formula: {
                      type: 'string',
                      description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const message = response.body;

        expect(message.toolCalls.length).to.eql(1);
        expect(message.toolCalls[0].function.name).to.eql('calculator');
        expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
      });

      // simulated FC is only for openAI
      if (connectorType === '.gen-ai') {
        judgedIt('executes a tool with simulated function calling', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              system:
                'Please answer the user question. You can use the available tools if you think it can help',
              messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
              functionCalling: 'simulated',
              toolChoice: 'required',
              tools: {
                calculator: {
                  description: 'The calculator can be used to resolve mathematical calculations',
                  schema: {
                    type: 'object',
                    properties: {
                      formula: {
                        type: 'string',
                        description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                      },
                    },
                  },
                },
              },
            })
            .expect(200);

          const message = response.body;

          expect(message.toolCalls.length).to.eql(1);
          expect(message.toolCalls[0].function.name).to.eql('calculator');
          expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
        });
      }

      judgedIt('returns token counts', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const { tokens } = response.body;

        expect(tokens.prompt).to.be.greaterThan(0);
        expect(tokens.completion).to.be.greaterThan(0);
        expect(tokens.total).eql(tokens.prompt + tokens.completion);
      });

      it('returns an error with the expected shape in case of error', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId: 'do-not-exist',
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(400);

        const message = response.body;

        expect(message).to.eql({
          type: 'error',
          code: 'requestError',
          message: "No connector or inference endpoint found for ID 'do-not-exist'",
        });
      });
    });

    describe('streaming enabled', () => {
      judgedIt('returns a chat completion message for a simple prompt', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            temperature: 0.1,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const events = await readStreamEvents(response);
        const message = events[events.length - 1];

        expect(message.type).to.eql(
          'chatCompletionMessage',
          `expected the last event to be a chatCompletionMessage, events: ${describeEvents(events)}`
        );
        expect(message.toolCalls).to.eql(
          [],
          `expected no tool calls, events: ${describeEvents(events)}`
        );
        expect(message.content).to.contain(
          '4',
          `expected the message content to contain "4", events: ${describeEvents(events)}`
        );
      });

      judgedIt('executes a tool when explicitly requested', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system:
              'Please answer the user question. You can use the available tools if you think it can help',
            messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
            toolChoice: 'required',
            tools: {
              calculator: {
                description: 'The calculator can be used to resolve mathematical calculations',
                schema: {
                  type: 'object',
                  properties: {
                    formula: {
                      type: 'string',
                      description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const events = await readStreamEvents(response);
        const message = events[events.length - 1];

        expect(message.type).to.eql(
          'chatCompletionMessage',
          `expected the last event to be a chatCompletionMessage, events: ${describeEvents(events)}`
        );
        expect(message.toolCalls.length).to.eql(
          1,
          `expected exactly one tool call, events: ${describeEvents(events)}`
        );
        expect(message.toolCalls[0].function.name).to.eql('calculator');
        expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
      });

      judgedIt('returns a token count event', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const events = await readStreamEvents(response);
        const tokenEvent = events[events.length - 2];

        expect(tokenEvent.type).to.eql(
          'chatCompletionTokenCount',
          `expected the second-to-last event to be a chatCompletionTokenCount, events: ${describeEvents(
            events
          )}`
        );
        expect(tokenEvent.tokens.prompt).to.be.greaterThan(0);
        expect(tokenEvent.tokens.completion).to.be.greaterThan(0);
        // can include thinking token depending on the model
        const totalIsPromptAndCompletion =
          tokenEvent.tokens.total === tokenEvent.tokens.prompt + tokenEvent.tokens.completion;
        const totalIsPromptCompletionAndThinking =
          tokenEvent.tokens.total ===
          tokenEvent.tokens.prompt + tokenEvent.tokens.completion + tokenEvent.tokens.thinking;
        expect(totalIsPromptAndCompletion || totalIsPromptCompletionAndThinking).to.be(true);
        // Model field is optional and may be present if provided by the connector
        if (tokenEvent.model !== undefined) {
          expect(tokenEvent.model).to.be.a('string');
        }
      });

      it('returns an error with the expected shape in case of error', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId: 'do-not-exist',
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const events = await lastValueFrom(observable.pipe(toArray()));

        expect(events).to.eql([
          {
            type: 'error',
            error: {
              code: 'requestError',
              message: "No connector or inference endpoint found for ID 'do-not-exist'",
              meta: {
                status: 400,
              },
            },
          },
        ]);
      });
    });
  });
};
