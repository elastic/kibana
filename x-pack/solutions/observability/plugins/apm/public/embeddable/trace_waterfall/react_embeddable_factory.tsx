/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import { initializeTitleManager, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { isEmpty } from 'lodash';
import { ApmEmbeddableContext } from '../embeddable_context';
import type { EmbeddableDeps } from '../types';
import { APM_TRACE_WATERFALL_EMBEDDABLE } from './constant';
import { TraceWaterfallEmbeddable } from './trace_waterfall_embeddable';
import { FocusedTraceWaterfallEmbeddable } from './focused_trace_waterfall_embeddable';

interface BaseProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
}

export interface ApmTraceWaterfallEmbeddableFocusedProps extends BaseProps, SerializedTitles {
  docId: string;
}

export interface ApmTraceWaterfallEmbeddableEntryProps extends BaseProps, SerializedTitles {
  serviceName: string;
  entryTransactionId: string;
  displayLimit?: number;
}

export type ApmTraceWaterfallEmbeddableProps =
  | ApmTraceWaterfallEmbeddableFocusedProps
  | ApmTraceWaterfallEmbeddableEntryProps;

export const getApmTraceWaterfallEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: ReactEmbeddableFactory<
    ApmTraceWaterfallEmbeddableProps,
    ApmTraceWaterfallEmbeddableProps,
    DefaultEmbeddableApi<ApmTraceWaterfallEmbeddableProps>
  > = {
    type: APM_TRACE_WATERFALL_EMBEDDABLE,
    deserializeState: (state) => {
      return state.rawState as ApmTraceWaterfallEmbeddableProps;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const titleManager = initializeTitleManager(state);
      const serviceName$ = new BehaviorSubject('serviceName' in state ? state.serviceName : '');
      const traceId$ = new BehaviorSubject(state.traceId);
      const entryTransactionId$ = new BehaviorSubject(
        'entryTransactionId' in state ? state.entryTransactionId : ''
      );
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom);
      const rangeTo$ = new BehaviorSubject(state.rangeTo);
      const displayLimit$ = new BehaviorSubject('displayLimit' in state ? state.displayLimit : 0);
      const docId$ = new BehaviorSubject('docId' in state ? state.docId : '');

      const api = buildApi(
        {
          ...titleManager.api,
          serializeState: () => {
            return {
              rawState: {
                ...titleManager.serialize(),
                serviceName: serviceName$.getValue(),
                traceId: traceId$.getValue(),
                entryTransactionId: entryTransactionId$.getValue(),
                rangeFrom: rangeFrom$.getValue(),
                rangeTo: rangeTo$.getValue(),
                displayLimit: displayLimit$.getValue(),
                docId: docId$.getValue(),
              },
            };
          },
        },
        {
          ...titleManager.comparators,
          serviceName: [serviceName$, (value) => serviceName$.next(value)],
          traceId: [traceId$, (value) => traceId$.next(value)],
          entryTransactionId: [entryTransactionId$, (value) => entryTransactionId$.next(value)],
          rangeFrom: [rangeFrom$, (value) => rangeFrom$.next(value)],
          rangeTo: [rangeTo$, (value) => rangeFrom$.next(value)],
          displayLimit: [displayLimit$, (value) => displayLimit$.next(value)],
          docId: [docId$, (value) => docId$.next(value)],
        }
      );

      return {
        api,
        Component: () => {
          const [
            serviceName,
            traceId,
            entryTransactionId,
            rangeFrom,
            rangeTo,
            displayLimit,
            docId,
          ] = useBatchedPublishingSubjects(
            serviceName$,
            traceId$,
            entryTransactionId$,
            rangeFrom$,
            rangeTo$,
            displayLimit$,
            docId$
          );
          const content = isEmpty(docId) ? (
            <TraceWaterfallEmbeddable
              serviceName={serviceName}
              traceId={traceId}
              entryTransactionId={entryTransactionId}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              displayLimit={displayLimit}
            />
          ) : (
            <FocusedTraceWaterfallEmbeddable
              traceId={traceId}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              docId={docId}
            />
          );

          return (
            <ApmEmbeddableContext deps={deps} rangeFrom={rangeFrom} rangeTo={rangeTo}>
              {content}
            </ApmEmbeddableContext>
          );
        },
      };
    },
  };
  return factory;
};
