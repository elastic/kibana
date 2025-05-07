/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { EmbeddableApmAlertingVizProps } from '../types';
import type { EmbeddableDeps } from '../../types';
import { ApmEmbeddableContext } from '../../embeddable_context';
import { APMAlertingFailedTransactionsChart } from './chart';
import { APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE } from '../constants';

export const getApmAlertingFailedTransactionsChartEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    EmbeddableApmAlertingVizProps,
    DefaultEmbeddableApi<EmbeddableApmAlertingVizProps>
  > = {
    type: APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const titleManager = initializeTitleManager(state);
      const serviceName$ = new BehaviorSubject(state.serviceName);
      const transactionType$ = new BehaviorSubject(state.transactionType);
      const transactionName$ = new BehaviorSubject(state.transactionName);
      const environment$ = new BehaviorSubject(state.environment);
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom);
      const rangeTo$ = new BehaviorSubject(state.rangeTo);
      const rule$ = new BehaviorSubject(state.rule);
      const alert$ = new BehaviorSubject(state.alert);
      const kuery$ = new BehaviorSubject(state.kuery);
      const filters$ = new BehaviorSubject(state.filters);

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            serviceName: serviceName$.getValue(),
            transactionType: transactionType$.getValue(),
            transactionName: transactionName$.getValue(),
            environment: environment$.getValue(),
            rangeFrom: rangeFrom$.getValue(),
            rangeTo: rangeTo$.getValue(),
            rule: rule$.getValue(),
            alert: alert$.getValue(),
            kuery: kuery$.getValue(),
            filters: filters$.getValue(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          serviceName$,
          transactionType$,
          transactionName$,
          environment$,
          rangeFrom$,
          rangeTo$,
          rule$,
          alert$,
          kuery$,
          filters$
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          serviceName: 'referenceEquality',
          transactionType: 'referenceEquality',
          transactionName: 'referenceEquality',
          environment: 'referenceEquality',
          rangeFrom: 'referenceEquality',
          rangeTo: 'referenceEquality',
          rule: 'referenceEquality',
          alert: 'referenceEquality',
          kuery: 'referenceEquality',
          filters: 'referenceEquality',
        }),
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);
          serviceName$.next(lastSaved?.rawState.serviceName ?? '');
          transactionType$.next(lastSaved?.rawState.transactionType);
          transactionName$.next(lastSaved?.rawState.transactionName);
          environment$.next(lastSaved?.rawState.environment);
          rangeFrom$.next(lastSaved?.rawState.rangeFrom);
          rangeTo$.next(lastSaved?.rawState.rangeTo);
          rule$.next(lastSaved?.rawState.rule as EmbeddableApmAlertingVizProps['rule']);
          alert$.next(lastSaved?.rawState.alert as EmbeddableApmAlertingVizProps['alert']);
          kuery$.next(lastSaved?.rawState.kuery);
          filters$.next(lastSaved?.rawState.filters);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        serializeState,
      });

      return {
        api,
        Component: () => {
          const [
            serviceName,
            transactionType,
            transactionName,
            environment,
            rangeFrom,
            rangeTo,
            rule,
            alert,
            kuery,
            filters,
          ] = useBatchedPublishingSubjects(
            serviceName$,
            transactionType$,
            transactionName$,
            environment$,
            rangeFrom$,
            rangeTo$,
            rule$,
            alert$,
            kuery$,
            filters$
          );

          return (
            <ApmEmbeddableContext deps={deps} rangeFrom={rangeFrom} rangeTo={rangeTo}>
              <APMAlertingFailedTransactionsChart
                rule={rule}
                alert={alert}
                serviceName={serviceName}
                transactionType={transactionType}
                environment={environment}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                transactionName={transactionName}
                kuery={kuery}
                filters={filters}
              />
            </ApmEmbeddableContext>
          );
        },
      };
    },
  };
  return factory;
};
