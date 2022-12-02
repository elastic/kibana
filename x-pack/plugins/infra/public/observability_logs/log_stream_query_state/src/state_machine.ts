/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { assign, createMachine } from 'xstate';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithDataViews,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
  AnyQuery,
  LogStreamQueryContextWithParsedQuery,
} from './types';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRACZmzHABZxARhnyArOIBsADjUyZAGhBZEGmTilTxyjeOMBONQGZxAXyf60mXAAtysd9noAjujYAGIY3AC2AKqEAMLe+DAQLOxIIDx8AkJpYggylrL29vLM4vbMNmX6hggA7PI4xhrMOg7MJcW1Lm7BXj5+WIG9YZFRGJTx5ImQKcIZ-ISCwrm1FTjKjpZK9hr1MjbViLW1OKvG9srM9cxq4rXK3SADON6+vfQQ5CTkAGqEYAB3WCTabJNhzXgLJY5RB2E4XcSSYolS4HAxHE5nJS1O7MZQ2GSaR7PV7PABuVEInzIiXoFOo1MW+AAyqgAMZssCQGbgtLzLLLRCE8SmWr2HFiipVdEIcrKU5XDSVCy3PEXYm9F79TX0qlfYhQOmUxmCELkQiUHmpLiQgUwhA2HGyNQqWpWNTMDTKeTyQ6yvEKt3K5SqjYPR74bgQODCAYQzJMwUIAC0aj9yZUJhU8hsyg2ahsSs09g1HjwRFIFGodAg8ah2VAuTkfp9NgVxXsagcqxdVlL2C1bw8dbtjcQ4pOOd2d3KlXs6e0ODU3tz+cLdg0JdcT01pJ1xpHiftcnlU4ls+lNTkbY0Ps98jUYo9qn7fSHA+IutrfNtR7HDskHBxEdb0QxRCo-WvRo71vR9OzxZxtxJbUyy-fVEkPaF-wLDQcBKYD7BsHNjgfPQZURNsShdWpNHEE9NhcFwgA */
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
                validationSucceeded: {
                  target: 'valid',
                  actions: 'storeParsedQuery',
                },
                validationFailed: {
                  target: 'invalid',
                  actions: 'storeValidationError',
                },
              },
            },
          },
          on: {
            queryFromUiChanged: {
              target: '.validating',
              actions: ['updateUrl', 'storeQuery'],
            },
            queryFromUrlChanged: {
              target: '.validating',
              actions: 'storeQuery',
            },
            dataViewsChanged: {
              target: '.validating',
              actions: 'storeDataViews',
            },
          },
        },
      },
    },
    {
      actions: {
        storeQuery: assign((_context, event) =>
          'query' in event ? ({ query: event.query } as LogStreamQueryContextWithQuery) : {}
        ),
        storeDataViews: assign((_context, event) =>
          'dataViews' in event
            ? ({ dataViews: event.dataViews } as LogStreamQueryContextWithDataViews)
            : {}
        ),
        storeValidationError: assign((_context, event) =>
          'error' in event
            ? ({
                validationError: event.error,
              } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithValidationError)
            : {}
        ),
        storeParsedQuery: assign((_context, event) =>
          'parsedQuery' in event
            ? ({ parsedQuery: event.parsedQuery } as LogStreamQueryContextWithParsedQuery)
            : {}
        ),
        clearValidationError: assign(
          (_context, _event) =>
            ({ validationError: undefined } as Omit<
              LogStreamQueryContextWithValidationError,
              'validationError'
            >)
        ),
        clearParsedQuery: assign(
          (_context, _event) =>
            ({ parsedQuery: undefined } as Omit<
              LogStreamQueryContextWithParsedQuery,
              'parsedQuery'
            >)
        ),
      },
    }
  );

const getValidationError = (query: AnyQuery): Error | undefined => {};

const getValidationErrorMemoized = memoizeOne(getValidationError);
