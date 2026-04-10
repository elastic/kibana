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
import { BehaviorSubject, map, merge } from 'rxjs';
import type { EmbeddableApmAlertingLatencyVizProps } from '../types';
import type { EmbeddableDeps } from '../../types';
import { ApmEmbeddableContext } from '../../embeddable_context';
import { APMAlertingLatencyChart } from './chart';
import { APM_ALERTING_LATENCY_CHART_EMBEDDABLE } from '../constants';

export const getApmAlertingLatencyChartEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    EmbeddableApmAlertingLatencyVizProps,
    DefaultEmbeddableApi<EmbeddableApmAlertingLatencyVizProps>
  > = {
    type: APM_ALERTING_LATENCY_CHART_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, initializeStateApi }) => {
      const state = initialState;
      const titleManager = initializeTitleManager(state);

      // TODO, these behaviourSubjects should be replaced with a state manager.
      const serviceName$ = new BehaviorSubject(state.serviceName);
      const transactionType$ = new BehaviorSubject(state.transactionType);
      const transactionName$ = new BehaviorSubject(state.transactionName);
      const environment$ = new BehaviorSubject(state.environment);
      const latencyThresholdInMicroseconds$ = new BehaviorSubject(
        state.latencyThresholdInMicroseconds
      );
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom);
      const rangeTo$ = new BehaviorSubject(state.rangeTo);
      const rule$ = new BehaviorSubject(state.rule);
      const alert$ = new BehaviorSubject(state.alert);
      const kuery$ = new BehaviorSubject(state.kuery);
      const filters$ = new BehaviorSubject(state.filters);

      const stateApi = initializeStateApi({
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          serviceName$,
          transactionType$,
          transactionName$,
          environment$,
          latencyThresholdInMicroseconds$,
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
          latencyThresholdInMicroseconds: 'referenceEquality',
          rangeFrom: 'referenceEquality',
          rangeTo: 'referenceEquality',
          rule: 'referenceEquality',
          alert: 'referenceEquality',
          kuery: 'referenceEquality',
          filters: 'referenceEquality',
        }),
        serializeState: () => ({
          ...titleManager.getLatestState(),
          serviceName: serviceName$.getValue(),
          transactionType: transactionType$.getValue(),
          transactionName: transactionName$.getValue(),
          environment: environment$.getValue(),
          latencyThresholdInMicroseconds: latencyThresholdInMicroseconds$.getValue(),
          rangeFrom: rangeFrom$.getValue(),
          rangeTo: rangeTo$.getValue(),
          rule: rule$.getValue(),
          alert: alert$.getValue(),
          kuery: kuery$.getValue(),
          filters: filters$.getValue(),
        }),
        applySerializedState: (nextState) => {
          titleManager.reinitializeState(nextState);
          serviceName$.next(nextState?.serviceName ?? '');
          transactionType$.next(nextState?.transactionType);
          transactionName$.next(nextState?.transactionName);
          environment$.next(nextState?.environment);
          latencyThresholdInMicroseconds$.next(nextState?.latencyThresholdInMicroseconds);
          rangeFrom$.next(nextState?.rangeFrom);
          rangeTo$.next(nextState?.rangeTo);
          kuery$.next(nextState?.kuery);
          filters$.next(nextState?.filters);
          if (nextState?.rule) rule$.next(nextState.rule);
          if (nextState?.alert) alert$.next(nextState.alert);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...stateApi,
      });

      return {
        api,
        Component: () => {
          const [
            serviceName,
            transactionType,
            transactionName,
            environment,
            latencyThresholdInMicroseconds,
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
            latencyThresholdInMicroseconds$,
            rangeFrom$,
            rangeTo$,
            rule$,
            alert$,
            kuery$,
            filters$
          );

          return (
            <ApmEmbeddableContext deps={deps} rangeFrom={rangeFrom} rangeTo={rangeTo}>
              <APMAlertingLatencyChart
                rule={rule}
                alert={alert}
                latencyThresholdInMicroseconds={latencyThresholdInMicroseconds}
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
