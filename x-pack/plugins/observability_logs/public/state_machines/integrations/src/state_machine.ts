/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { actions, createMachine } from 'xstate';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationTypestate,
} from './types';

const defaultContext = {
  integrations: [],
  error: null,
  page: 0,
};

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = defaultContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJgDsnMrICc8hbIBs0zgBZ5ADgA0IAJ4yAzCrLT5KgKybO92Z2cHNmgL5eTaTDj4xKRk9ES4EDRQrAAyAPIAggAiyAByAOIA+gDKAKoAwvkAokVJpVy8SCCCwqKo4lIIBioGZBb20va6mgYWnJ7yuibmCAoWZOqauhadKppdBl0+fhhYeHXkYRFRsYkpGZkAYgnIMeU84jUiwQ0y3bpknCrSuk-NHbYWw4gWv2SaFm6PUW80MKmWIH8ayCJE24UiqCgAFkiNgwLtkmksnlCiUykkKpchNcxFVGrILJobLpdB0LB4DINZC9vgh7M42jN6Z1NIZ2rJ7BCoYENqF4VEUWiMfsssdTudKgJiXVbggALT2R6aAWfAxyeyGZz2VlOKm2XRyTqyWSvAVC1Yi4LkWBgXDYADGAAsosL1k7pVicgViqUFUTajcyYgKWaaXSGUyWWYZG4yB4tFpXtpAep7QE-bCyC63V6fQ6C6QAwc5WcCRcqlcVVH1UoprTdB4ZgL5IMPKy1VM2pxGczBp4LQZZHnoaKthA2AAlIrxZKZNIAFSK6QXCXXyDiqWyhIbysjoEaBgMD0ZlM4WhenkvrN01rIKhmk+0Bk4L0W08dhZzmwK5JJkSJxEua6pJu267vuh7HkqEakue0aeBMfQ0umBrfsayYIPSVKvA40i2Ko9jtAY-4VnCERsNkRQJAu+QABJQTBO57geR71khJL1M2sh6soBp2BS8g4f0rKZm+pE0taLzvlM8jUTCIRzlEhy4AQ9CLsuezsVunHwTxirVKeKGSHcHb-D0t5ZjML7SV0abaBaqiKb+Pi+CAqBEPO8BVL6amBXxTaoeq342GReiXvqPZ4SMaqdNIabDuo5rjtIk6qaKVA0NcDDMJA4b8aqchWI8iwqNa758hYsistI1iuKoKgOFerhXrouVOmK2yIqV4VWQgpGMo8lrSACTj6L00mUv8cntBR8ieM4vWAeKiKSmAQ1niNaqqG+FpZgKz4WPIbSGDaNq-O0nDtBtITFh63qIsFGx7ZZjRqg10XqLFerdhJTWKMoepyLSnXDjST20fOEBfQJEVOLIZDdCO3SAg9tLSeNpFzIYjIqN0hgqT5H19RpiJaTpJUnshyMjVN7U2HZFEs-YDjSRa6NyS+zK6Ep+jeV4QA */
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Integrations',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
        },
        loading: {
          entry: 'notifyLoadingStarted',
          invoke: {
            src: 'loadIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: 'storeIntegrations',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        loadingMore: {
          invoke: {
            src: 'loadMoreIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: 'appendIntegrations',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        searchingIntegrations: {
          invoke: {
            src: 'searchIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: 'storeIntegrations',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        loaded: {
          entry: 'notifyLoadingSucceeded',
          on: {
            RELOAD_INTEGRATIONS: 'loading',
            LOAD_MORE_INTEGRATIONS: 'loadingMore',
            SEARCH_INTEGRATIONS: 'searchingIntegrations',
          },
        },
        loadingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RELOAD_INTEGRATIONS: {
              target: 'loading',
            },
          },
        },
      },
    },
    {
      actions: {
        notifyLoadingStarted: actions.pure(() => undefined),
        notifyLoadingSucceeded: actions.pure(() => undefined),
        notifyLoadingFailed: actions.pure(() => undefined),
      },
    }
  );

export interface IntegrationsStateMachineDependencies {
  initialContext: IntegrationsContext;
  logViews: IIntegrationsClient;
}

export const createIntegrationStateMachine = ({
  initialContext,
  integrations,
}: IntegrationsStateMachineDependencies) =>
  createPureIntegrationsStateMachine(initialContext).withConfig({
    actions: {},
    services: {
      loadIntegrations: (context) =>
        from(
          'logViewReference' in context
            ? integrations.getIntegrations()
            : throwError(() => new Error('Failed to load integrations'))
        ).pipe(
          map(
            (data): IntegrationsEvent => ({
              type: 'LOADING_SUCCEEDED',
              integrations: data.items,
              page: data.pageAfter,
            })
          ),
          catchError((error) =>
            of<IntegrationsEvent>({
              type: 'LOADING_FAILED',
              error,
            })
          )
        ),
    },
  });
