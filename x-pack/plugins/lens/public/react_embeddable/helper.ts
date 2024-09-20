/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { isOfQueryType } from '@kbn/es-query';
import { LensRuntimeState, LensSerializedState } from './types';
import type { LensAttributesService } from '../lens_attribute_service';

// Shared logic to ensure the attributes are correctly loaded
export async function deserializeState(
  attributeService: LensAttributesService,
  rawState: LensSerializedState
) {
  if (rawState.savedObjectId) {
    const { attributes, managed, sharingSavedObjectProps } = await attributeService.loadFromLibrary(
      rawState.savedObjectId
    );
    return { ...rawState, attributes, managed, sharingSavedObjectProps };
  }
  return ('attributes' in rawState ? rawState : { attributes: rawState }) as LensRuntimeState;
}

export function emptySerializer() {
  return {};
}

export function NonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

type ComparatorType<T extends unknown> = [
  BehaviorSubject<T>,
  (newValue: T) => void,
  (a: T, b: T) => boolean
];

type ObservableFactoryReturnType<T extends unknown> = [BehaviorSubject<T>, ComparatorType<T>];

export function makeComparator<T extends unknown>(
  observable: BehaviorSubject<T>
): ComparatorType<T> {
  return [observable, (newValue: T) => observable.next(newValue), fastIsEqual];
}

export function buildObservableVariable<T extends unknown>(
  variable: T | PublishingSubject<NonNullable<T>>
): ObservableFactoryReturnType<T> {
  if (variable instanceof BehaviorSubject) {
    return [variable, makeComparator(variable as BehaviorSubject<T>)];
  }
  const variable$ = new BehaviorSubject<T>(variable as T);
  return [variable$, makeComparator(variable$)];
}

export function isTextBasedLanguage(state: LensRuntimeState) {
  return !isOfQueryType(state.attributes?.state.query);
}
