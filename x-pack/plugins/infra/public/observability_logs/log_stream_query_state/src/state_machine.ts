/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, EsQueryConfig, isOfQueryType } from '@kbn/es-query';
import { actions, createMachine, SpecialTargets } from 'xstate';
import { QueryParsingError, UnsupportedLanguageError } from './errors';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithDataViews,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
  LogStreamQueryContextWithParsedQuery,
} from './types';
import { logStreamQueryNotificationEventSelectors } from './notifications';
import { sendIfDefined } from '../../xstate_helpers';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRACZmzHABZxARhnyArOIBsADjUyZAGhBZEGmTilTxyjeOMBONQGZxAXyf60mXAAtysd9nrIAKoAogBKAJoA+gBioQDyALKRgQCSkQDCABIAggByAOLBACIs7EggPHwCQuViCDL2Jhr2Nvb2DmryzK0A7Pb6hgg9PTg9zMb2ysw9XWriMy5u6Ng43r7LWAEhETHxSYGhADIZOQXFpcKV-ISCwnWa4jjyXT3K8mo2w+96BojDo+MGlMZsw5q9FiA-F4fFD6EVsgAVbKRABqKWCAHUAMonPKFEpsS68a63WqIGxTHD2ZjKRqvWnKNS0gbktQ4T5qNTjZiNJk9cT2CFQ1YwjY4ABuVEIEHIZHwUHoKOyhxS8IRKTiuRi2RSh3OhPKV2qd1ZJnmMmmGmeNPGNhZCGpygBPQ0NnEFjmNMmQrFa2FkuoMrlCqVKrVGq1WMC6XSwWK+rKXGJxrJ9QaAKZ1OGDmmymU9sdztd7sZkgZLlcIHw3AgcGEUKJVRuNVAdQAtGp7W3FGabCplDZpuJPhZnJXhQRiNcpXQII2SS3RIg5PbnjYAfZ5O0HGNOlYfR4ResPPOU63EPZ-vIbBp+X1ugKu4zRn3lGMbEpmDJ+coZAeVn6YoBtKp7Nia9QWE8N53tSbr9L8EHrlaXRWmofRcqo-7QseKzEMBc6GsmYGpm60jDq8KidDadoIXISHWqh6E0mOSyHoBh74bKxBQKBpLnggHwaE8zDDi015fNo9ruuuszyD0DxyLSFgVk4QA */
  createMachine<LogStreamQueryContext, LogStreamQueryEvent, LogStreamQueryTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Query',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'hasQuery',
            actions: ['initializeFromUrl', 'populateUrl'],
          },
        },
        hasQuery: {
          invoke: {
            src: 'subscribeToUrlStateStorageChanges',
          },
          initial: 'validating',
          states: {
            valid: {
              entry: 'notifyValidQueryChanged',
            },
            invalid: {
              entry: 'notifyInvalidQueryChanged',
            },
            validating: {
              entry: ['clearValidationError', 'clearParsedQuery'],
              invoke: {
                src: 'validateQuery',
              },
              on: {
                VALIDATION_FAILED: {
                  target: 'invalid',
                  actions: 'storeValidationError',
                },
                VALIDATION_SUCCEEDED: {
                  target: 'valid',
                  actions: 'storeParsedQuery',
                },
              },
            },
          },
          on: {
            QUERY_FROM_UI_CHANGED: {
              target: '.validating',
              actions: ['updateQueryInUrl', 'storeQuery'],
            },
            QUERY_FROM_URL_CHANGED: {
              target: '.validating',
              actions: ['updateQueryInUi', 'storeQuery'],
            },
            DATA_VIEWS_CHANGED: {
              target: '.validating',
              actions: 'storeDataViews',
            },
          },
        },
      },
    },
    {
      actions: {
        notifyInvalidQueryChanged: actions.pure(() => undefined),
        notifyValidQueryChanged: actions.pure(() => undefined),
        storeQuery: actions.assign((_context, event) =>
          'query' in event ? ({ query: event.query } as LogStreamQueryContextWithQuery) : {}
        ),
        storeDataViews: actions.assign((_context, event) =>
          'dataViews' in event
            ? ({ dataViews: event.dataViews } as LogStreamQueryContextWithDataViews)
            : {}
        ),
        storeValidationError: actions.assign((_context, event) =>
          'error' in event
            ? ({
                validationError: event.error,
              } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithValidationError)
            : {}
        ),
        storeParsedQuery: actions.assign((_context, event) =>
          'parsedQuery' in event
            ? ({ parsedQuery: event.parsedQuery } as LogStreamQueryContextWithParsedQuery)
            : {}
        ),
        clearValidationError: actions.assign(
          (_context, _event) =>
            ({ validationError: undefined } as Omit<
              LogStreamQueryContextWithValidationError,
              'validationError'
            >)
        ),
        clearParsedQuery: actions.assign(
          (_context, _event) =>
            ({ parsedQuery: undefined } as Omit<
              LogStreamQueryContextWithParsedQuery,
              'parsedQuery'
            >)
        ),
      },
    }
  );

export const createLogStreamQueryStateMachine = ({
  initialContext,
  kibanaQuerySettings,
}: {
  initialContext: LogStreamQueryContextWithDataViews;
  kibanaQuerySettings: EsQueryConfig;
}) =>
  createPureLogStreamQueryStateMachine(initialContext).withConfig({
    actions: {
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: actions.pure(() => undefined),
      updateQueryInUrl: () => {},
      updateQueryInUi: () => {},
    },
    services: {
      validateQuery: (context) => (send) => {
        if (!('query' in context)) {
          throw new Error('Failed to validate query: no query in context');
        }

        const { dataViews, query } = context;

        if (!isOfQueryType(query)) {
          send({
            type: 'VALIDATION_FAILED',
            error: new UnsupportedLanguageError('Failed to validate query: unsupported language'),
          });

          return;
        }

        try {
          const parsedQuery = buildEsQuery(dataViews, query, [], kibanaQuerySettings);

          send({
            type: 'VALIDATION_SUCCEEDED',
            parsedQuery,
          });
        } catch (error) {
          send({
            type: 'VALIDATION_FAILED',
            error: new QueryParsingError(`${error}`),
          });
        }
      },
    },
  });
