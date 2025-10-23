/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { i18n } from '@kbn/i18n';
import type { IWaterfallGetRelatedErrorsHref } from '../../../common/waterfall/typings';
import { ApmEmbeddableContext } from '../embeddable_context';
import type { EmbeddableDeps } from '../types';
import { APM_TRACE_WATERFALL_EMBEDDABLE } from './constant';
import { TraceWaterfallEmbeddable } from './trace_waterfall_embeddable';
import { FocusedTraceWaterfallEmbeddable } from './focused_trace_waterfall_embeddable';
import type { OnErrorClick } from '../../components/shared/trace_waterfall/trace_waterfall_context';

interface BaseProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
}

export interface ApmTraceWaterfallEmbeddableFocusedProps extends BaseProps, SerializedTitles {
  docId: string;
  mode: 'summary';
}

export interface ApmTraceWaterfallEmbeddableEntryProps extends BaseProps, SerializedTitles {
  serviceName: string;
  displayLimit?: number;
  scrollElement?: Element;
  onNodeClick?: (nodeSpanId: string) => void;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  onErrorClick?: OnErrorClick;
  mode: 'full';
}

export type ApmTraceWaterfallEmbeddableProps =
  | ApmTraceWaterfallEmbeddableFocusedProps
  | ApmTraceWaterfallEmbeddableEntryProps;

export const getApmTraceWaterfallEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    ApmTraceWaterfallEmbeddableProps,
    DefaultEmbeddableApi<ApmTraceWaterfallEmbeddableProps>
  > = {
    type: APM_TRACE_WATERFALL_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const titleManager = initializeTitleManager(state);
      const serviceName$ = new BehaviorSubject('serviceName' in state ? state.serviceName : '');
      const traceId$ = new BehaviorSubject(state.traceId);
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom);
      const rangeTo$ = new BehaviorSubject(state.rangeTo);
      const mode$ = new BehaviorSubject(state.mode);
      const displayLimit$ = new BehaviorSubject('displayLimit' in state ? state.displayLimit : 0);
      const docId$ = new BehaviorSubject('docId' in state ? state.docId : '');
      const scrollElement$ = new BehaviorSubject(
        'scrollElement' in state ? state.scrollElement : undefined
      );
      const onNodeClick$ = new BehaviorSubject(
        'onNodeClick' in state ? state.onNodeClick : undefined
      );
      const getRelatedErrorsHref$ = new BehaviorSubject(
        'getRelatedErrorsHref' in state ? state.getRelatedErrorsHref : undefined
      );
      const onErrorClick$ = new BehaviorSubject(
        'onErrorClick' in state ? state.onErrorClick : undefined
      );

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            serviceName: serviceName$.getValue(),
            traceId: traceId$.getValue(),
            rangeFrom: rangeFrom$.getValue(),
            rangeTo: rangeTo$.getValue(),
            displayLimit: displayLimit$.getValue(),
            docId: docId$.getValue(),
            scrollElement: scrollElement$.getValue(),
            onNodeClick: onNodeClick$.getValue(),
            getRelatedErrorsHref: getRelatedErrorsHref$.getValue(),
            onErrorClick: onErrorClick$.getValue(),
            mode: mode$.getValue(),
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
          rangeFrom$,
          rangeTo$,
          displayLimit$,
          docId$,
          scrollElement$,
          onNodeClick$,
          getRelatedErrorsHref$,
          onErrorClick$,
          mode$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
            ...titleComparators,
            serviceName: 'referenceEquality',
            traceId: 'referenceEquality',
            rangeFrom: 'referenceEquality',
            rangeTo: 'referenceEquality',
            displayLimit: 'referenceEquality',
            docId: 'referenceEquality',
            scrollElement: 'referenceEquality',
            onNodeClick: 'referenceEquality',
            getRelatedErrorsHref: 'referenceEquality',
            onErrorClick: 'referenceEquality',
            mode: 'referenceEquality',
          };
        },
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);

          // reset base state
          traceId$.next(lastSaved?.rawState.traceId ?? '');
          rangeFrom$.next(lastSaved?.rawState.rangeFrom ?? '');
          rangeTo$.next(lastSaved?.rawState.rangeTo ?? '');
          mode$.next(lastSaved?.rawState.mode ?? 'summary');

          // reset entry state
          const entryState = lastSaved?.rawState as ApmTraceWaterfallEmbeddableEntryProps;
          serviceName$.next(entryState?.serviceName ?? '');
          displayLimit$.next(entryState?.displayLimit ?? 0);
          scrollElement$.next(entryState?.scrollElement ?? undefined);
          onNodeClick$.next(entryState?.onNodeClick ?? undefined);
          getRelatedErrorsHref$.next(entryState?.getRelatedErrorsHref ?? undefined);
          onErrorClick$.next(entryState?.onErrorClick ?? undefined);

          // reset focused state
          const focusedState = lastSaved?.rawState as ApmTraceWaterfallEmbeddableFocusedProps;
          docId$.next(focusedState?.docId ?? '');
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
          const [
            serviceName,
            traceId,
            rangeFrom,
            rangeTo,
            displayLimit,
            docId,
            scrollElement,
            onNodeClick,
            getRelatedErrorsHref,
            onErrorClick,
            mode,
          ] = useBatchedPublishingSubjects(
            serviceName$,
            traceId$,
            rangeFrom$,
            rangeTo$,
            displayLimit$,
            docId$,
            scrollElement$,
            onNodeClick$,
            getRelatedErrorsHref$,
            onErrorClick$,
            mode$
          );
          const content =
            mode === 'full' ? (
              <TraceWaterfallEmbeddable
                serviceName={serviceName}
                traceId={traceId}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                displayLimit={displayLimit}
                onNodeClick={onNodeClick}
                scrollElement={scrollElement}
                getRelatedErrorsHref={getRelatedErrorsHref}
                onErrorClick={onErrorClick}
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
            <KibanaSectionErrorBoundary
              sectionName={i18n.translate(
                'xpack.apm.embeddable.traceWaterfall.kibanaSectionErrorBoundary.sectionName',
                {
                  defaultMessage: 'Trace waterfall',
                }
              )}
            >
              <ApmEmbeddableContext deps={deps} rangeFrom={rangeFrom} rangeTo={rangeTo}>
                {content}
              </ApmEmbeddableContext>
            </KibanaSectionErrorBoundary>
          );
        },
      };
    },
  };
  return factory;
};
