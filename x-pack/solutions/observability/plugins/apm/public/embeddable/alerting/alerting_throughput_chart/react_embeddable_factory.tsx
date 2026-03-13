/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { ApmEmbeddableContext } from '../../embeddable_context';
import type { EmbeddableDeps } from '../../types';
import { APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE } from '../constants';
import type { EmbeddableApmAlertingVizProps } from '../types';
import { APMAlertingThroughputChart } from './chart';

export const getApmAlertingThroughputChartEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    EmbeddableApmAlertingVizProps,
    DefaultEmbeddableApi<EmbeddableApmAlertingVizProps>
  > = {
    type: APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState;
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
          titleManager.reinitializeState(lastSaved);
          serviceName$.next(lastSaved?.serviceName ?? '');
          transactionType$.next(lastSaved?.transactionType);
          transactionName$.next(lastSaved?.transactionName);
          environment$.next(lastSaved?.environment);
          rangeFrom$.next(lastSaved?.rangeFrom);
          rangeTo$.next(lastSaved?.rangeTo);
          rule$.next(lastSaved?.rule as EmbeddableApmAlertingVizProps['rule']);
          alert$.next(lastSaved?.alert as EmbeddableApmAlertingVizProps['alert']);
          kuery$.next(lastSaved?.kuery);
          filters$.next(lastSaved?.filters);
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
              <APMAlertingThroughputChart
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
