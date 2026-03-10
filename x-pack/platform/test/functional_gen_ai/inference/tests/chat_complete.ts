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
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type SuperTest from 'supertest';
import type { FtrProviderContext } from '../ftr_provider_context';

export const setAiAnonymizationSettings = async (supertest: SuperTest.Agent, rules: object) => {
  const globalTargetId = '__kbn_global_anonymization_profile__';

  const findResponse = await supertest
    .get(`/internal/anonymization/profiles/_find?target_type=index&target_id=${globalTargetId}`)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .expect(200);

  const profileId = findResponse.body?.data?.[0]?.id as string | undefined;
  if (!profileId) {
    throw new Error('Global anonymization profile was not found/created in FTR setup');
  }

  const inputRules = ((rules as { rules?: Array<Record<string, unknown>> })?.rules ?? []).filter(
    (rule) => {
      const type = String(rule.type ?? '').toLowerCase();
      return type === 'regexp' || type === 'regex';
    }
  );

  const regexRules = inputRules.map((rule, index) => ({
    id: `ftr-global-regex-${index}`,
    type: 'regex',
    entityClass: rule.entityClass,
    pattern: rule.pattern,
    enabled: rule.enabled ?? true,
  }));

  return supertest
    .put(`/internal/anonymization/profiles/${profileId}`)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({
      rules: {
        fieldRules: [],
        regexRules,
      },
    })
    .expect(200);
};

const emailRule = {
  entityClass: 'EMAIL',
  type: 'RegExp',
  pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  enabled: true,
};

export const chatCompleteSuite = (
  { id: connectorId, actionTypeId: connectorType }: AvailableConnectorWithId,
  { getService }: FtrProviderContext
) => {
  const supertest = getService('supertest');
  const alertsDataViewId = 'security-solution-alert-default';
  const profilesApi = '/internal/anonymization/profiles';

  const findAlertsProfile = async () => {
    const profileFindQuery = `${profilesApi}/_find?target_type=data_view&target_id=${encodeURIComponent(
      alertsDataViewId
    )}`;
    const response = await supertest
      .get(profileFindQuery)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(200);

    return response.body;
  };

  const deleteAlertsProfileIfExists = async () => {
    const findBody = await findAlertsProfile();
    const profileId = findBody?.data?.[0]?.id as string | undefined;
    if (!profileId) {
      return;
    }

    await supertest
      .delete(`${profilesApi}/${profileId}`)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect(200);
  };

  const ensureAlertsDataViewExists = async () => {
    await supertest
      .post('/api/saved_objects/index-pattern/security-solution-alert-default')
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send({
        attributes: {
          title: '.alerts-security.alerts-default',
          timeFieldName: '@timestamp',
        },
      })
      .expect((res) => {
        if (res.status !== 200 && res.status !== 409) {
          throw new Error(`Failed to create alerts data view: ${res.status} ${res.text}`);
        }
      });
  };

  describe('chatComplete API', () => {
    describe('streaming disabled', () => {
      it('returns a chat completion message for a simple prompt', async () => {
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

      it('executes a tool with native function calling', async () => {
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
        it('executes a tool with simulated function calling', async () => {
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

      it('returns token counts', async () => {
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
          message:
            "No connector found for id 'do-not-exist'\nSaved object [action/do-not-exist] not found",
        });
      });

      describe('anonymization enabled', () => {
        before(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [emailRule] });
        });
        after(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [] });
        });
        it('returns a chat completion message with deanonymization data', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);
          const message = response.body;
          expect(message.deanonymized_input[0].deanonymizations[0].entity.value).to.be(
            'jorge@gmail.com'
          );
          const emailMask = message.deanonymized_output.deanonymizations[0].entity.mask;
          expect(message.content.includes(emailMask)).to.be(false);
        });

        it('auto-creates alerts data view profile on first chat_complete for alerts target', async () => {
          try {
            await deleteAlertsProfileIfExists();
            await ensureAlertsDataViewExists();

            const before = await findAlertsProfile();
            expect(before.total).to.be(0);

            await supertest
              .post(`/internal/inference/chat_complete`)
              .set('kbn-xsrf', 'kibana')
              .send({
                connectorId,
                temperature: 0.1,
                system: 'Please answer the user question',
                metadata: {
                  anonymization: {
                    target: {
                      targetType: 'data_view',
                      targetId: alertsDataViewId,
                    },
                  },
                },
                messages: [{ role: 'user', content: 'Give me a short hello response.' }],
              })
              .expect(200);

            const after = await findAlertsProfile();
            expect(after.total).to.be(1);
            expect(after.data[0].name).to.be('Security Alerts Anonymization Profile');
            expect(after.data[0].rules.fieldRules.length).to.be.greaterThan(100);
            expect(
              after.data[0].rules.fieldRules.find(
                (rule: { field: string; anonymized: boolean }) =>
                  rule.field === 'host.name' && rule.anonymized === true
              )
            ).to.not.be(undefined);
            expect(
              after.data[0].rules.fieldRules.find(
                (rule: { field: string; anonymized: boolean }) =>
                  rule.field === 'user.name' && rule.anonymized === true
              )
            ).to.not.be(undefined);
          } finally {
            await deleteAlertsProfileIfExists();
          }
        });
      });
      describe('anonymization disabled', () => {
        before(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [] });
        });
        it('returns a chat completion message without deanonymization data', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);

          const message = response.body;
          expect(message.deanonymized_input).to.be(undefined);
          expect(message.deanonymized_output).to.be(undefined);
        });
      });
    });

    describe('streaming enabled', () => {
      it('returns a chat completion message for a simple prompt', async () => {
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

        const observable = supertestToObservable(response);

        const message = await lastValueFrom(observable);

        expect(message.type).to.eql('chatCompletionMessage');
        expect(message.toolCalls).to.eql([]);
        expect(message.content).to.contain('4');
      });

      it('executes a tool when explicitly requested', async () => {
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

        const observable = supertestToObservable(response);

        const message = await lastValueFrom(observable);

        expect(message.toolCalls.length).to.eql(1);
        expect(message.toolCalls[0].function.name).to.eql('calculator');
        expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
      });

      it('returns a token count event', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const events = await lastValueFrom(observable.pipe(toArray()));
        const tokenEvent = events[events.length - 2];

        expect(tokenEvent.type).to.eql('chatCompletionTokenCount');
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
              message:
                "No connector found for id 'do-not-exist'\nSaved object [action/do-not-exist] not found",
              meta: {
                status: 400,
              },
            },
          },
        ]);
      });

      describe('anonymization disabled', () => {
        before(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [] });
        });
        it('returns events without deanonymization data', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);

          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));
          const messageEvent = events.find((event) => event.type === 'chatCompletionMessage');
          expect(messageEvent.deanonymized_input).to.be(undefined);
          expect(messageEvent.deanonymized_output).to.be(undefined);
        });
      });

      describe('anonymization enabled', () => {
        before(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [emailRule] });
        });
        after(async () => {
          await setAiAnonymizationSettings(supertest, { rules: [] });
        });
        it('returns a chat completion message with deanonymization data and does not stream the response', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com.  what is my email?' },
              ],
            })
            .expect(200);
          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));
          expect(events.length).to.eql(3);
          const chatCompletionChunks = events.filter(
            (event) => event.type === 'chatCompletionChunk'
          );
          expect(chatCompletionChunks.length).to.eql(1);
          const chatCompletionMessage = events.filter(
            (event) => event.type === 'chatCompletionMessage'
          );
          expect(chatCompletionMessage.length).to.eql(1);
          const relevantEvents = chatCompletionMessage.concat(chatCompletionChunks);
          relevantEvents.forEach((event) => {
            expect(event.deanonymized_input[0].deanonymizations[0].entity.value).to.be(
              'jorge@gmail.com'
            );
            const emailMask = event.deanonymized_output.deanonymizations[0].entity.mask;
            expect(event.content.includes(emailMask)).to.be(false);
          });
        });

        it('returns no deanonymization data when no PII is detected even with rules enabled', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [{ role: 'user', content: 'What is 2+2? No personal information here.' }],
            })
            .expect(200);

          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));

          const messageEvent = events.find((event) => event.type === 'chatCompletionMessage');
          expect(messageEvent.deanonymized_input).to.be(undefined);
          expect(messageEvent.deanonymized_output).to.be(undefined);
        });
      });
    });
  });
};
