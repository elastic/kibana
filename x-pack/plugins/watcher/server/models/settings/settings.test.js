/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Settings } from './settings';

describe('settings module', () => {
  describe('Settings class', () => {
    describe('fromUpstreamJson factory method', () => {
      describe('when no upstream JSON is specified', () => {
        it('returns the correct Settings instance', () => {
          const settings = Settings.fromUpstreamJson();

          const actionTypes = settings.actionTypes;
          expect(actionTypes.email.enabled).toBe(false);
          expect(actionTypes.webhook.enabled).toBe(true);
          expect(actionTypes.index.enabled).toBe(true);
          expect(actionTypes.logging.enabled).toBe(true);
          expect(actionTypes.slack.enabled).toBe(false);
          expect(actionTypes.jira.enabled).toBe(false);
          expect(actionTypes.pagerduty.enabled).toBe(false);
        });
      });

      describe('when upstream JSON contains a configured action type', () => {
        it('returns the correct Settings instance', () => {
          const upstreamJson = {
            persistent: {
              xpack: {
                notification: {
                  email: {
                    account: {
                      foo: {},
                      bar: {},
                    },
                    default_account: 'bar',
                  },
                },
              },
            },
            defaults: {
              xpack: {
                notification: {
                  email: {
                    account: {
                      scooby: {},
                      scrappy: {},
                    },
                    default_account: 'scooby',
                  },
                },
              },
            },
          };
          const settings = Settings.fromUpstreamJson(upstreamJson);

          const actionTypes = settings.actionTypes;
          expect(actionTypes.email.enabled).toBe(true);
          expect(actionTypes.email.accounts.scooby.default).toBe(true);
          expect(actionTypes.email.accounts.scrappy).toBeInstanceOf(Object);
          expect(actionTypes.email.accounts.foo).toBeInstanceOf(Object);
          expect(actionTypes.email.accounts.bar).toBeInstanceOf(Object);
        });
      });
    });

    describe('downstreamJson getter method', () => {
      it('returns correct JSON for client', () => {
        const upstreamJson = {
          defaults: {
            xpack: {
              notification: {
                email: {
                  account: {
                    scooby: {},
                    scrappy: {},
                  },
                  default_account: 'scooby',
                },
              },
            },
          },
        };
        const settings = Settings.fromUpstreamJson(upstreamJson);
        const json = settings.downstreamJson;

        expect(json.action_types.email.enabled).toBe(true);
        expect(json.action_types.email.accounts.scooby.default).toBe(true);
        expect(json.action_types.email.accounts.scrappy).toBeInstanceOf(Object);
        expect(json.action_types.webhook.enabled).toBe(true);
        expect(json.action_types.index.enabled).toBe(true);
        expect(json.action_types.logging.enabled).toBe(true);
        expect(json.action_types.slack.enabled).toBe(false);
        expect(json.action_types.jira.enabled).toBe(false);
        expect(json.action_types.pagerduty.enabled).toBe(false);
      });
    });
  });
});
