/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTitles, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { EmbeddableApmAlertingVizProps } from '../types';
import type { EmbeddableDeps } from '../../types';
import { ApmEmbeddableContext } from '../../embeddable_context';
import { APMAlertingFailedTransactionsChart } from './chart';

export const APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE =
  'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE';

export const getApmAlertingFailedTransactionsChartEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: ReactEmbeddableFactory<
    EmbeddableApmAlertingVizProps,
    EmbeddableApmAlertingVizProps,
    DefaultEmbeddableApi<EmbeddableApmAlertingVizProps>
  > = {
    type: APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE,
    deserializeState: (state) => {
      return state.rawState as EmbeddableApmAlertingVizProps;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
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

      const api = buildApi(
        {
          ...titlesApi,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
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
          },
        },
        {
          serviceName: [serviceName$, (value) => serviceName$.next(value)],
          transactionType: [transactionType$, (value) => transactionType$.next(value)],
          transactionName: [transactionName$, (value) => transactionName$.next(value)],
          environment: [environment$, (value) => environment$.next(value)],
          rangeFrom: [rangeFrom$, (value) => rangeFrom$.next(value)],
          rangeTo: [rangeTo$, (value) => rangeTo$.next(value)],
          rule: [rule$, (value) => rule$.next(value)],
          alert: [alert$, (value) => alert$.next(value)],
          kuery: [kuery$, (value) => kuery$.next(value)],
          filters: [filters$, (value) => filters$.next(value)],
          ...titleComparators,
        }
      );

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
