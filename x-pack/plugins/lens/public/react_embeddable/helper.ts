/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasParentApi,
  apiPublishesViewMode,
  getInheritedViewMode,
  ViewMode,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { RenderMode } from '@kbn/expressions-plugin/common';
import { LensRuntimeState, LensSerializedState } from './types';
import type { LensAttributesService } from '../lens_attribute_service';

export function createEmptyLensState(
  visualizationType: null | string = null,
  title?: LensSerializedState['title'],
  description?: LensSerializedState['description'],
  query?: LensSerializedState['query'],
  filters?: LensSerializedState['filters']
) {
  return {
    attributes: {
      title: title ?? '',
      description: description ?? '',
      visualizationType,
      references: [],
      state: {
        query: query || { query: '', language: 'kuery' },
        filters: filters || [],
        internalReferences: [],
        datasourceStates: {},
        visualization: {},
      },
    },
  };
}

// Shared logic to ensure the attributes are correctly loaded
export async function deserializeState(
  attributeService: LensAttributesService,
  rawState: LensSerializedState
) {
  if (rawState.savedObjectId) {
    try {
      const { attributes, managed, sharingSavedObjectProps } =
        await attributeService.loadFromLibrary(rawState.savedObjectId);
      return { ...rawState, attributes, managed, sharingSavedObjectProps };
    } catch (e) {
      // return an empty Lens document if no saved object is found
      return { ...rawState, attributes: createEmptyLensState().attributes };
    }
  }
  return ('attributes' in rawState ? rawState : { attributes: rawState }) as LensRuntimeState;
}

export function emptySerializer() {
  return {};
}

export function NonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export type ComparatorType<T extends unknown> = [
  BehaviorSubject<T>,
  (newValue: T) => void,
  (a: T, b: T) => boolean
];

export function makeComparator<T extends unknown>(
  observable: BehaviorSubject<T>
): ComparatorType<T> {
  return [observable, (newValue: T) => observable.next(newValue), fastIsEqual];
}

/**
 * Helper function to either extract an observable from an API or create a new one
 * with a default value to start with.
 * Note that extracting from the API will make subscription emit if the value changes upstream
 * as it keeps the original reference without cloning.
 * @returns the observable and a comparator to use for detecting "unsaved changes" on it
 */
export function buildObservableVariable<T extends unknown>(
  variable: T | PublishingSubject<T>
): [BehaviorSubject<T>, ComparatorType<T>] {
  if (variable instanceof BehaviorSubject) {
    return [variable, makeComparator(variable)];
  }
  const variable$ = new BehaviorSubject<T>(variable as T);
  return [variable$, makeComparator(variable$)];
}

export function isTextBasedLanguage(state: LensRuntimeState) {
  return isOfAggregateQueryType(state.attributes?.state.query);
}

export function getViewMode(api: unknown) {
  return apiPublishesViewMode(api) ? getInheritedViewMode(api) : undefined;
}

export function getRenderMode(api: unknown): RenderMode {
  const mode = getViewMode(api) ?? 'view';
  return mode === 'print' ? 'view' : mode;
}

export function extractInheritedViewModeObservable(
  parentApi?: unknown
): PublishingSubject<ViewMode> {
  if (apiPublishesViewMode(parentApi)) {
    return parentApi.viewMode;
  }
  if (apiHasParentApi(parentApi)) {
    return extractInheritedViewModeObservable(parentApi.parentApi);
  }
  return new BehaviorSubject<ViewMode>('view');
}
