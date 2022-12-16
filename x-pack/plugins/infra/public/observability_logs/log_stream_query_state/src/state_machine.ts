/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryConfig } from '@kbn/es-query';
import { actions, ActorRefFrom, createMachine, SpecialTargets } from 'xstate';
import { QueryStringContract } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { OmitDeprecatedState, sendIfDefined } from '../../xstate_helpers';
import { logStreamQueryNotificationEventSelectors } from './notifications';
import { validateQuery } from './validate_query_service';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithDataViews,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
} from './types';
import { subscribeToSearchBarChanges, updateQueryInSearchBar } from './search_bar_state_service';
import { initializeFromUrl } from './url_state_storage_service';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFYATDmYBmWQDYAnMwAsARknjZ69aoA0ILIgDs05pNnjN4hQA5JS9SbsBfV4bSZcAC3KwvbHpkAFUAUQAlAE0AfQAxCIB5AFkYkIiAGRiAYQAJAEEAOQBxMIARFnYkEB4+ASFqsQR7aV1mE0VJBXlFJUNjBDtZHBNxZjlJZiUFSVHbd090bBw-AKWsejL8gBV8mIA1AEkwgHUAZRyCkvLK4Vr+QkFhJqVxOxxZZm1VOasFbX6iGmOCUJn+3Ts6i+6ns6gWIECvn8iOC4Wi8SSqTOYXyETyMQAQrjLkVShU2HdeA8no1EPJxDhVApVPIIRopAYjIghiMxnJmHoobJHOJ4YiVsj1jgAG5UQgQchkfBQej7fIZQ5bbaHRKFeL5Q4ZG4U6r3erPIHMnCzVTtN56STqKyAhCOaSWKQWWS2pSWWQmMVS1bi2XUBVKlVqjVanV6s4hbLZMLlY1VLhU820hCyOwKEbMf6qVSSOx2axaF1u61WSaWH1+gPw-DcCBwYSIyl1R4NUBNAC06m0ODsZnE2lkSl99gULoHVskqknvpLCmZTtUge8eCIpAo1DoEE71J7okQA6+w9H48nXVzshduiU+Z0YOnJlUoo8CKDku8R8zvaICWJiMsyrI5uyC6zmCIyLkoQyDn6UiSJuyzBlKobyv+3YWtm9g4Oo8FmB0UyWC6xZPpCUKQgoHQKF8KFfuK6FbsQmGHqaGY4VmvrMNaoLWLYUJjH0XIIBRw5tDRdEMahSJrFu7GKsQUDYTSgHNPBBEWEoE6ESYJgwpyAySI42kKM4LTFtoWjuO4QA */
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
            actions: ['initializeFromUrl', 'updateQueryInUrl', 'updateQueryInSearchBar'],
          },
        },
        hasQuery: {
          invoke: [
            {
              src: 'subscribeToUrlStateStorageChanges',
            },
            {
              src: 'subscribeToSearchBarChanges',
            },
          ],
          initial: 'validating',
          states: {
            valid: {
              entry: 'notifyValidQueryChanged',
            },
            invalid: {
              entry: 'notifyInvalidQueryChanged',
            },
            validating: {
              invoke: {
                src: 'validateQuery',
              },
              on: {
                VALIDATION_FAILED: {
                  target: 'invalid',
                  actions: ['clearParsedQuery', 'storeValidationError'],
                },
                VALIDATION_SUCCEEDED: {
                  target: 'valid',
                  actions: ['clearValidationError', 'storeParsedQuery'],
                },
              },
            },
          },
          on: {
            QUERY_FROM_URL_CHANGED: {
              target: '.validating',
              actions: ['storeQuery', 'updateQueryInSearchBar'],
            },
            DATA_VIEWS_CHANGED: {
              target: '.validating',
              actions: 'storeDataViews',
            },
            QUERY_FROM_SEARCH_BAR_CHANGED: {
              target: '.validating',
              actions: ['storeQuery', 'updateQueryInUrl'],
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

export interface LogStreamQueryStateMachineDependencies {
  kibanaQuerySettings: EsQueryConfig;
  queryStringService: QueryStringContract;
  urlStateStorage: IKbnUrlStateStorage;
}

export const createLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews,
  {
    kibanaQuerySettings,
    queryStringService,
    urlStateStorage,
  }: LogStreamQueryStateMachineDependencies
) =>
  createPureLogStreamQueryStateMachine(initialContext).withConfig({
    actions: {
      initializeFromUrl: initializeFromUrl({ urlStateStorage }),
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.validQueryChanged
      ),
      updateQueryInUrl: () => {},
      updateQueryInSearchBar: updateQueryInSearchBar({ queryStringService }),
    },
    services: {
      validateQuery: validateQuery({ kibanaQuerySettings }),
      subscribeToSearchBarChanges: subscribeToSearchBarChanges({ queryStringService }),
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
