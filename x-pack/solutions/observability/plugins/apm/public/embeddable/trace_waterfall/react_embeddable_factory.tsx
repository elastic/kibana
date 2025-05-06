/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import { initializeTitleManager, titleComparators, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { ApmEmbeddableContext } from '../embeddable_context';
import type { EmbeddableDeps } from '../types';
import { APM_TRACE_WATERFALL_EMBEDDABLE } from './constant';
import { TraceWaterfallEmbeddable } from './trace_waterfall_embeddable';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';

export interface ApmTraceWaterfallEmbeddableProps extends SerializedTitles {
  serviceName: string;
  traceId: string;
  entryTransactionId: string;
  rangeFrom: string;
  rangeTo: string;
  displayLimit?: number;
}

export const getApmTraceWaterfallEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    ApmTraceWaterfallEmbeddableProps,
    DefaultEmbeddableApi<ApmTraceWaterfallEmbeddableProps>
  > = {
    type: APM_TRACE_WATERFALL_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const titleManager = initializeTitleManager(state);
      const serviceName$ = new BehaviorSubject(state.serviceName);
      const traceId$ = new BehaviorSubject(state.traceId);
      const entryTransactionId$ = new BehaviorSubject(state.entryTransactionId);
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom);
      const rangeTo$ = new BehaviorSubject(state.rangeTo);
      const displayLimit$ = new BehaviorSubject(state.displayLimit);

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            serviceName: serviceName$.getValue(),
            traceId: traceId$.getValue(),
            entryTransactionId: entryTransactionId$.getValue(),
            rangeFrom: rangeFrom$.getValue(),
            rangeTo: rangeTo$.getValue(),
            displayLimit: displayLimit$.getValue(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<ApmTraceWaterfallEmbeddableProps>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          serviceName$,
          traceId$,
          entryTransactionId$,
          rangeFrom$,
          rangeTo$,
          displayLimit$,
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
            ...titleComparators,
            serviceName: 'referenceEquality',
            traceId: 'referenceEquality',
            entryTransactionId: 'referenceEquality',
            rangeFrom: 'referenceEquality',
            rangeTo: 'referenceEquality',
            displayLimit: 'referenceEquality',
          };
        },
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);

          traceId$.next(lastSaved?.rawState.traceId ?? '');
          rangeFrom$.next(lastSaved?.rawState.rangeFrom ?? '');
          rangeFrom$.next(lastSaved?.rawState.rangeTo ?? '');
          serviceName$.next(lastSaved?.rawState.serviceName ?? '');
          entryTransactionId$.next(lastSaved?.rawState.entryTransactionId ?? '');
          displayLimit$.next(lastSaved?.rawState.displayLimit ?? 0);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        serializeState,
      });

      return {
        api,
        Component: () => {
          const [serviceName, traceId, entryTransactionId, rangeFrom, rangeTo, displayLimit] =
            useBatchedPublishingSubjects(
              serviceName$,
              traceId$,
              entryTransactionId$,
              rangeFrom$,
              rangeTo$,
              displayLimit$
            );

          return (
            <ApmEmbeddableContext deps={deps} rangeFrom={rangeFrom} rangeTo={rangeTo}>
              <TraceWaterfallEmbeddable
                serviceName={serviceName}
                traceId={traceId}
                entryTransactionId={entryTransactionId}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                displayLimit={displayLimit}
              />
            </ApmEmbeddableContext>
          );
        },
      };
    },
  };
  return factory;
};